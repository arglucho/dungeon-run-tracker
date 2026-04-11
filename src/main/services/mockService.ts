import { getDatabase } from '../database'

const MOCK_DUNGEONS = [
  { name: 'Mazmorra Jalató', rooms: 10 },
  { name: 'Mazmorra Blopígono', rooms: 8 },
  { name: 'Mazmorra Escara', rooms: 12 }
]

const MOCK_RESOURCES = [
  'Lana de jalatín blanco',
  'Cuero de jalatín negro',
  'Baba de jalató',
  'Pluma de kwak',
  'Madera de fresno',
  'Mineral de hierro',
  'Cuero de cardo',
  'Tela de araña'
]

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const mockService = {
  generateMockRuns(count: number): { generated: number } {
    const db = getDatabase()

    // Ensure dungeons exist
    for (const d of MOCK_DUNGEONS) {
      const existing = db.prepare('SELECT id FROM dungeons WHERE name = ?').get(d.name)
      if (!existing) {
        db.prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)').run(d.name, d.rooms)
      }
    }

    // Ensure resources exist
    for (const r of MOCK_RESOURCES) {
      const existing = db.prepare('SELECT id FROM resources WHERE name = ?').get(r)
      if (!existing) {
        db.prepare('INSERT INTO resources (name) VALUES (?)').run(r)
      }
    }

    const dungeons = db.prepare('SELECT id, expected_rooms FROM dungeons').all() as {
      id: number
      expected_rooms: number
    }[]
    const resources = db.prepare('SELECT id FROM resources WHERE is_active = 1').all() as {
      id: number
    }[]

    let generated = 0
    const transaction = db.transaction(() => {
      for (let i = 0; i < count; i++) {
        const dungeon = dungeons[rand(0, dungeons.length - 1)]
        const isGroup = Math.random() > 0.6 ? 1 : 0
        const daysAgo = rand(0, 90)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysAgo)
        startDate.setHours(rand(8, 22), rand(0, 59), rand(0, 59))

        const status = Math.random() > 0.1 ? 'COMPLETED' : 'ABANDONED'
        const roomCount =
          status === 'COMPLETED' ? dungeon.expected_rooms : rand(1, dungeon.expected_rooms - 1)

        let totalXp = 0
        let totalKamas = 0
        let totalTime = 0

        const runResult = db
          .prepare(
            `INSERT INTO runs (dungeon_id, start_time, is_group, status, notes)
             VALUES (?, ?, ?, 'IN_PROGRESS', ?)`
          )
          .run(dungeon.id, startDate.toISOString(), isGroup, Math.random() > 0.7 ? 'Run de prueba mock' : null)
        const runId = runResult.lastInsertRowid as number

        for (let r = 1; r <= roomCount; r++) {
          const roomTime = rand(30, 180)
          const roomXp = rand(500, 5000)
          const roomKamas = rand(100, 2000)
          const turns = Math.random() > 0.3 ? rand(2, 15) : null

          totalTime += roomTime
          totalXp += roomXp
          totalKamas += roomKamas

          const roomResult = db
            .prepare(
              `INSERT INTO rooms (run_id, room_number, turns, time_seconds, xp, kamas)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(runId, r, turns, roomTime, roomXp, roomKamas)
          const roomId = roomResult.lastInsertRowid as number

          // Add 0-3 resources per room
          const resourceCount = rand(0, 3)
          const usedResources = new Set<number>()
          for (let rc = 0; rc < resourceCount && resources.length > 0; rc++) {
            const res = resources[rand(0, resources.length - 1)]
            if (usedResources.has(res.id)) continue
            usedResources.add(res.id)
            db.prepare('INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)').run(
              roomId,
              res.id,
              rand(1, 5)
            )
          }
        }

        const endDate = new Date(startDate.getTime() + totalTime * 1000)
        db.prepare(
          `UPDATE runs SET status = ?, end_time = ?, total_time_seconds = ?, total_xp = ?, total_kamas = ?
           WHERE id = ?`
        ).run(status, endDate.toISOString(), totalTime, totalXp, totalKamas, runId)

        generated++
      }
    })

    transaction()
    return { generated }
  }
}
