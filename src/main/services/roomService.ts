import { getDatabase } from '../database'

interface RoomRow {
  id: number
  run_id: number
  room_number: number
  turns: number | null
  time_seconds: number
  xp: number
  kamas: number
  notes: string | null
  created_at: string
}

interface RoomResourceRow {
  id: number
  room_id: number
  resource_id: number
  resource_name: string
  quantity: number
}

interface CreateRoomInput {
  run_id: number
  turns?: number
  time_seconds: number
  xp: number
  kamas: number
  notes?: string
  resources: { resource_id: number; quantity: number }[]
}

interface UpdateRoomInput {
  turns?: number
  time_seconds?: number
  xp?: number
  kamas?: number
  notes?: string
  resources?: { resource_id: number; quantity: number }[]
}

function recalculateRunTotals(runId: number): void {
  const db = getDatabase()
  const totals = db
    .prepare(
      `SELECT
        COALESCE(SUM(time_seconds), 0) as total_time,
        COALESCE(SUM(xp), 0) as total_xp,
        COALESCE(SUM(kamas), 0) as total_kamas
      FROM rooms WHERE run_id = ?`
    )
    .get(runId) as { total_time: number; total_xp: number; total_kamas: number }

  db.prepare(
    'UPDATE runs SET total_time_seconds = ?, total_xp = ?, total_kamas = ? WHERE id = ?'
  ).run(totals.total_time, totals.total_xp, totals.total_kamas, runId)
}

export const roomService = {
  add(input: CreateRoomInput): { id: number; run_finished: boolean } {
    const db = getDatabase()

    // Obtener run y mazmorra
    const run = db
      .prepare(
        `SELECT r.id, r.status, d.expected_rooms
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         WHERE r.id = ?`
      )
      .get(input.run_id) as { id: number; status: string; expected_rooms: number } | undefined

    if (!run) throw new Error('Run no encontrada')
    if (run.status !== 'IN_PROGRESS') throw new Error('La run no está en progreso')

    // Calcular número de sala
    const lastRoom = db
      .prepare('SELECT MAX(room_number) as max_num FROM rooms WHERE run_id = ?')
      .get(input.run_id) as { max_num: number | null }

    const roomNumber = (lastRoom.max_num || 0) + 1

    if (roomNumber > run.expected_rooms) {
      throw new Error(
        `No se pueden agregar más salas. La mazmorra tiene ${run.expected_rooms} salas esperadas.`
      )
    }

    // Validaciones
    if (input.time_seconds < 0) throw new Error('El tiempo no puede ser negativo')
    if (input.xp < 0) throw new Error('La XP no puede ser negativa')
    if (input.kamas < 0) throw new Error('Las kamas no pueden ser negativas')
    if (input.turns !== undefined && input.turns < 0) throw new Error('Los turnos no pueden ser negativos')

    const transaction = db.transaction(() => {
      // Insertar sala
      const result = db
        .prepare(
          `INSERT INTO rooms (run_id, room_number, turns, time_seconds, xp, kamas, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.run_id,
          roomNumber,
          input.turns ?? null,
          input.time_seconds,
          input.xp,
          input.kamas,
          input.notes?.trim() || null
        )

      const roomId = result.lastInsertRowid as number

      // Insertar recursos (agrupar duplicados sumando cantidad)
      const resourceMap = new Map<number, number>()
      for (const res of input.resources) {
        if (res.quantity < 1) throw new Error('La cantidad del recurso debe ser al menos 1')
        const current = resourceMap.get(res.resource_id) || 0
        resourceMap.set(res.resource_id, current + res.quantity)
      }

      const insertRes = db.prepare(
        'INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)'
      )

      for (const [resourceId, quantity] of resourceMap) {
        insertRes.run(roomId, resourceId, quantity)
      }

      // Recalcular totales
      recalculateRunTotals(input.run_id)

      // Auto-finalizar si es la última sala
      const isLastRoom = roomNumber === run.expected_rooms
      if (isLastRoom) {
        db.prepare(
          `UPDATE runs SET status = 'COMPLETED', end_time = datetime('now') WHERE id = ?`
        ).run(input.run_id)
      }

      return { id: roomId, run_finished: isLastRoom }
    })

    return transaction()
  },

  update(id: number, input: UpdateRoomInput): void {
    const db = getDatabase()
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined
    if (!room) throw new Error('Sala no encontrada')

    const transaction = db.transaction(() => {
      const fields: string[] = []
      const values: unknown[] = []

      if (input.turns !== undefined) {
        fields.push('turns = ?')
        values.push(input.turns)
      }
      if (input.time_seconds !== undefined) {
        if (input.time_seconds < 0) throw new Error('El tiempo no puede ser negativo')
        fields.push('time_seconds = ?')
        values.push(input.time_seconds)
      }
      if (input.xp !== undefined) {
        if (input.xp < 0) throw new Error('La XP no puede ser negativa')
        fields.push('xp = ?')
        values.push(input.xp)
      }
      if (input.kamas !== undefined) {
        if (input.kamas < 0) throw new Error('Las kamas no pueden ser negativas')
        fields.push('kamas = ?')
        values.push(input.kamas)
      }
      if (input.notes !== undefined) {
        fields.push('notes = ?')
        values.push(input.notes?.trim() || null)
      }

      if (fields.length > 0) {
        values.push(id)
        db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      // Actualizar recursos si se proporcionan
      if (input.resources !== undefined) {
        db.prepare('DELETE FROM room_resources WHERE room_id = ?').run(id)

        const resourceMap = new Map<number, number>()
        for (const res of input.resources) {
          if (res.quantity < 1) throw new Error('La cantidad del recurso debe ser al menos 1')
          const current = resourceMap.get(res.resource_id) || 0
          resourceMap.set(res.resource_id, current + res.quantity)
        }

        const insertRes = db.prepare(
          'INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)'
        )
        for (const [resourceId, quantity] of resourceMap) {
          insertRes.run(id, resourceId, quantity)
        }
      }

      recalculateRunTotals(room.run_id)
    })

    transaction()
  },

  deleteLast(runId: number): void {
    const db = getDatabase()

    const run = db.prepare('SELECT status FROM runs WHERE id = ?').get(runId) as
      | { status: string }
      | undefined
    if (!run) throw new Error('Run no encontrada')
    if (run.status !== 'IN_PROGRESS') throw new Error('Solo se pueden eliminar salas de una run en progreso')

    const lastRoom = db
      .prepare('SELECT id FROM rooms WHERE run_id = ? ORDER BY room_number DESC LIMIT 1')
      .get(runId) as { id: number } | undefined

    if (!lastRoom) throw new Error('No hay salas para eliminar')

    // CASCADE elimina room_resources automáticamente
    db.prepare('DELETE FROM rooms WHERE id = ?').run(lastRoom.id)
    recalculateRunTotals(runId)
  },

  getByRun(runId: number): (RoomRow & { resources: RoomResourceRow[] })[] {
    const db = getDatabase()
    const rooms = db
      .prepare('SELECT * FROM rooms WHERE run_id = ? ORDER BY room_number ASC')
      .all(runId) as RoomRow[]

    return rooms.map((room) => {
      const resources = db
        .prepare(
          `SELECT rr.*, r.name as resource_name
           FROM room_resources rr
           JOIN resources r ON rr.resource_id = r.id
           WHERE rr.room_id = ?`
        )
        .all(room.id) as RoomResourceRow[]

      return { ...room, resources }
    })
  }
}
