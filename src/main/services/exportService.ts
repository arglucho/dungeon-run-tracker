import { getDatabase } from '../database'
import { writeFileSync, readFileSync, copyFileSync } from 'fs'
import { dialog, BrowserWindow, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'

export const exportService = {
  exportRunJSON(runId: number): string {
    const db = getDatabase()
    const run = db
      .prepare(
        `SELECT r.*, d.name as dungeon_name, d.expected_rooms
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         WHERE r.id = ?`
      )
      .get(runId) as Record<string, unknown> | undefined

    if (!run) throw new Error('Run no encontrada')

    const rooms = db.prepare('SELECT * FROM rooms WHERE run_id = ? ORDER BY room_number ASC').all(runId)

    const roomsWithResources = (rooms as { id: number }[]).map((room) => {
      const resources = db
        .prepare(
          `SELECT rr.*, r.name as resource_name
           FROM room_resources rr
           JOIN resources r ON rr.resource_id = r.id
           WHERE rr.room_id = ?`
        )
        .all(room.id)
      return { ...room, resources }
    })

    const data = { ...run, rooms: roomsWithResources, exported_at: new Date().toISOString() }
    return JSON.stringify(data, null, 2)
  },

  exportAllRunsJSON(): string {
    const db = getDatabase()
    const runs = db
      .prepare(
        `SELECT r.*, d.name as dungeon_name
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         ORDER BY r.start_time DESC`
      )
      .all() as { id: number }[]

    const fullRuns = runs.map((run) => {
      const rooms = db.prepare('SELECT * FROM rooms WHERE run_id = ? ORDER BY room_number ASC').all(run.id)
      const roomsWithResources = (rooms as { id: number }[]).map((room) => {
        const resources = db
          .prepare(
            `SELECT rr.*, r.name as resource_name
             FROM room_resources rr
             JOIN resources r ON rr.resource_id = r.id
             WHERE rr.room_id = ?`
          )
          .all(room.id)
        return { ...room, resources }
      })
      return { ...run, rooms: roomsWithResources }
    })

    return JSON.stringify(
      { runs: fullRuns, exported_at: new Date().toISOString(), total: fullRuns.length },
      null,
      2
    )
  },

  exportRunPDF(runId: number): Uint8Array {
    // Importar jsPDF dinámicamente para evitar problemas de importación en main
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { jsPDF } = require('jspdf')
    const db = getDatabase()

    const run = db
      .prepare(
        `SELECT r.*, d.name as dungeon_name
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         WHERE r.id = ?`
      )
      .get(runId) as Record<string, unknown> | undefined

    if (!run) throw new Error('Run no encontrada')

    const rooms = db
      .prepare('SELECT * FROM rooms WHERE run_id = ? ORDER BY room_number ASC')
      .all(runId) as Record<string, unknown>[]

    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(16)
    doc.text(`Dungeon Run Tracker - Run #${run.id}`, 20, y)
    y += 10

    doc.setFontSize(12)
    doc.text(`Mazmorra: ${run.dungeon_name}`, 20, y)
    y += 7
    doc.text(`Estado: ${run.status}`, 20, y)
    y += 7
    doc.text(`Inicio: ${run.start_time}`, 20, y)
    y += 7
    doc.text(`XP Total: ${run.total_xp}`, 20, y)
    y += 7
    doc.text(`Kamas Total: ${run.total_kamas}`, 20, y)
    y += 7
    doc.text(`Tiempo Total: ${Math.floor((run.total_time_seconds as number) / 60)}m ${(run.total_time_seconds as number) % 60}s`, 20, y)
    y += 12

    doc.setFontSize(14)
    doc.text('Salas', 20, y)
    y += 8

    doc.setFontSize(10)
    for (const room of rooms) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(
        `Sala ${room.room_number}: XP=${room.xp}, Kamas=${room.kamas}, Tiempo=${room.time_seconds}s`,
        20,
        y
      )
      y += 6
    }

    return doc.output('arraybuffer') as Uint8Array
  },

  createBackup(): string {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) throw new Error('No hay ventana activa')

    const date = new Date().toISOString().split('T')[0]
    const result = dialog.showSaveDialogSync(window, {
      defaultPath: `backup_drt_${date}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })

    if (!result) throw new Error('Operación cancelada')

    const dbPath = is.dev
      ? join(process.cwd(), 'database_dev.db')
      : join(app.getPath('userData'), 'database.db')

    copyFileSync(dbPath, result)
    return result
  },

  restoreBackup(): void {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) throw new Error('No hay ventana activa')

    const result = dialog.showOpenDialogSync(window, {
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (!result || result.length === 0) throw new Error('Operación cancelada')

    const dbPath = is.dev
      ? join(process.cwd(), 'database_dev.db')
      : join(app.getPath('userData'), 'database.db')

    copyFileSync(result[0], dbPath)
    // Nota: la app debería reiniciarse después de restaurar
  },

  importRunsJSON(): { imported: number } {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) throw new Error('No hay ventana activa')

    const result = dialog.showOpenDialogSync(window, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (!result || result.length === 0) throw new Error('Operación cancelada')

    const raw = readFileSync(result[0], 'utf-8')
    const data = JSON.parse(raw)

    const db = getDatabase()
    let imported = 0

    const runs = data.runs || [data] // Puede ser un array de runs o una sola run

    const transaction = db.transaction(() => {
      for (const runData of runs) {
        // Verificar que la mazmorra existe o crearla
        let dungeon = db
          .prepare('SELECT id FROM dungeons WHERE name = ?')
          .get(runData.dungeon_name) as { id: number } | undefined

        if (!dungeon && runData.dungeon_name) {
          const res = db
            .prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)')
            .run(runData.dungeon_name, runData.expected_rooms || 10)
          dungeon = { id: res.lastInsertRowid as number }
        }

        if (!dungeon) continue

        const runResult = db
          .prepare(
            `INSERT INTO runs (dungeon_id, start_time, end_time, total_time_seconds, total_xp, total_kamas, is_group, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            dungeon.id,
            runData.start_time,
            runData.end_time,
            runData.total_time_seconds || 0,
            runData.total_xp || 0,
            runData.total_kamas || 0,
            runData.is_group || 0,
            runData.notes || null,
            runData.status || 'COMPLETED'
          )

        const newRunId = runResult.lastInsertRowid as number

        // Insertar salas
        if (runData.rooms && Array.isArray(runData.rooms)) {
          for (const roomData of runData.rooms) {
            const roomResult = db
              .prepare(
                `INSERT INTO rooms (run_id, room_number, turns, time_seconds, xp, kamas, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                newRunId,
                roomData.room_number,
                roomData.turns || null,
                roomData.time_seconds || 0,
                roomData.xp || 0,
                roomData.kamas || 0,
                roomData.notes || null
              )

            const newRoomId = roomResult.lastInsertRowid as number

            // Insertar recursos de sala
            if (roomData.resources && Array.isArray(roomData.resources)) {
              for (const resData of roomData.resources) {
                // Buscar o crear recurso
                let resource = db
                  .prepare('SELECT id FROM resources WHERE name = ?')
                  .get(resData.resource_name) as { id: number } | undefined

                if (!resource) {
                  const resResult = db
                    .prepare('INSERT INTO resources (name) VALUES (?)')
                    .run(resData.resource_name)
                  resource = { id: resResult.lastInsertRowid as number }
                }

                db.prepare(
                  'INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)'
                ).run(newRoomId, resource.id, resData.quantity || 1)
              }
            }
          }
        }

        imported++
      }
    })

    transaction()
    return { imported }
  }
}
