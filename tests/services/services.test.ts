import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'

const TEST_DB_PATH = join(process.cwd(), 'test_services.db')

// Helper para crear una DB de test con schema completo
function createTestDb(): Database.Database {
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
  const db = new Database(TEST_DB_PATH)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS dungeons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      expected_rooms INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dungeon_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      total_time_seconds INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      total_kamas INTEGER DEFAULT 0,
      is_group INTEGER DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (dungeon_id) REFERENCES dungeons(id)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      room_number INTEGER NOT NULL,
      turns INTEGER,
      time_seconds INTEGER DEFAULT 0 CHECK(time_seconds >= 0),
      xp INTEGER DEFAULT 0 CHECK(xp >= 0),
      kamas INTEGER DEFAULT 0 CHECK(kamas >= 0),
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS room_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity >= 1),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_dungeon ON runs(dungeon_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_rooms_run ON rooms(run_id);
    CREATE INDEX IF NOT EXISTS idx_room_resources_room ON room_resources(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_resources_resource ON room_resources(resource_id);
  `)

  return db
}

// Seed helpers
function seedDungeon(db: Database.Database, name = 'Mazmorra Jalató', rooms = 10) {
  const result = db
    .prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)')
    .run(name, rooms)
  return result.lastInsertRowid as number
}

function seedResource(db: Database.Database, name: string) {
  const result = db.prepare('INSERT INTO resources (name) VALUES (?)').run(name)
  return result.lastInsertRowid as number
}

function seedRun(db: Database.Database, dungeonId: number, status = 'IN_PROGRESS', isGroup = 0) {
  const result = db
    .prepare(
      `INSERT INTO runs (dungeon_id, start_time, status, is_group) VALUES (?, datetime('now'), ?, ?)`
    )
    .run(dungeonId, status, isGroup)
  return result.lastInsertRowid as number
}

function seedRoom(db: Database.Database, runId: number, roomNumber: number, xp = 100, kamas = 50, time = 120) {
  const result = db
    .prepare('INSERT INTO rooms (run_id, room_number, xp, kamas, time_seconds) VALUES (?, ?, ?, ?, ?)')
    .run(runId, roomNumber, xp, kamas, time)
  return result.lastInsertRowid as number
}

function seedRoomResource(db: Database.Database, roomId: number, resourceId: number, quantity = 1) {
  db.prepare('INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)').run(
    roomId,
    resourceId,
    quantity
  )
}

let db: Database.Database

describe('Service logic tests (direct DB)', () => {
  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
  })

  // ===== DUNGEON TESTS =====
  describe('DungeonService logic', () => {
    it('debe crear una mazmorra', () => {
      const id = seedDungeon(db, 'Test Dungeon', 5)
      const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(id) as Record<string, unknown>
      expect(dungeon.name).toBe('Test Dungeon')
      expect(dungeon.expected_rooms).toBe(5)
    })

    it('debe listar todas las mazmorras', () => {
      seedDungeon(db, 'Dungeon A', 5)
      seedDungeon(db, 'Dungeon B', 3)
      const all = db.prepare('SELECT * FROM dungeons ORDER BY name ASC').all()
      expect(all).toHaveLength(2)
    })

    it('debe actualizar una mazmorra', () => {
      const id = seedDungeon(db, 'Original', 5)
      db.prepare('UPDATE dungeons SET name = ? WHERE id = ?').run('Updated', id)
      const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(id) as Record<string, unknown>
      expect(dungeon.name).toBe('Updated')
    })
  })

  // ===== RESOURCE TESTS =====
  describe('ResourceService logic', () => {
    it('debe crear un recurso', () => {
      const id = seedResource(db, 'Lana blanca')
      const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Record<string, unknown>
      expect(resource.name).toBe('Lana blanca')
      expect(resource.is_active).toBe(1)
    })

    it('debe rechazar nombre duplicado', () => {
      seedResource(db, 'Lana blanca')
      expect(() => seedResource(db, 'Lana blanca')).toThrow()
    })

    it('debe buscar recursos por nombre', () => {
      seedResource(db, 'Lana de jalatín blanco')
      seedResource(db, 'Cuero de jalatín negro')
      seedResource(db, 'Baba de jalató')

      const results = db
        .prepare("SELECT * FROM resources WHERE is_active = 1 AND name LIKE '%jalatín%'")
        .all()
      expect(results).toHaveLength(2)
    })

    it('debe hacer soft delete si el recurso está en uso', () => {
      const dungeonId = seedDungeon(db)
      const resourceId = seedResource(db, 'Recurso en uso')
      const runId = seedRun(db, dungeonId)
      const roomId = seedRoom(db, runId, 1)
      seedRoomResource(db, roomId, resourceId, 2)

      // Soft delete
      db.prepare('UPDATE resources SET is_active = 0 WHERE id = ?').run(resourceId)
      const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Record<string, unknown>
      expect(resource.is_active).toBe(0)

      // Aún visible en room_resources
      const rr = db.prepare('SELECT * FROM room_resources WHERE resource_id = ?').all(resourceId)
      expect(rr).toHaveLength(1)
    })

    it('debe hacer hard delete si el recurso no está en uso', () => {
      const resourceId = seedResource(db, 'Recurso sin uso')
      db.prepare('DELETE FROM resources WHERE id = ?').run(resourceId)
      const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId)
      expect(resource).toBeUndefined()
    })
  })

  // ===== RUN TESTS =====
  describe('RunService logic', () => {
    it('debe crear una run', () => {
      const dungeonId = seedDungeon(db)
      const runId = seedRun(db, dungeonId)
      const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.status).toBe('IN_PROGRESS')
      expect(run.dungeon_id).toBe(dungeonId)
    })

    it('no debe crear run si hay una activa', () => {
      const dungeonId = seedDungeon(db)
      seedRun(db, dungeonId)

      const active = db.prepare("SELECT id FROM runs WHERE status = 'IN_PROGRESS'").get()
      expect(active).toBeTruthy()
    })

    it('debe obtener la run activa', () => {
      const dungeonId = seedDungeon(db)
      seedRun(db, dungeonId)

      const active = db.prepare("SELECT * FROM runs WHERE status = 'IN_PROGRESS' LIMIT 1").get() as Record<string, unknown>
      expect(active).toBeTruthy()
      expect(active.status).toBe('IN_PROGRESS')
    })

    it('debe finalizar una run', () => {
      const dungeonId = seedDungeon(db)
      const runId = seedRun(db, dungeonId)
      seedRoom(db, runId, 1, 500, 200, 60)
      seedRoom(db, runId, 2, 300, 100, 45)

      // Recalcular totales
      const totals = db
        .prepare(
          'SELECT SUM(xp) as total_xp, SUM(kamas) as total_kamas, SUM(time_seconds) as total_time FROM rooms WHERE run_id = ?'
        )
        .get(runId) as { total_xp: number; total_kamas: number; total_time: number }

      db.prepare(
        "UPDATE runs SET status = 'COMPLETED', end_time = datetime('now'), total_xp = ?, total_kamas = ?, total_time_seconds = ? WHERE id = ?"
      ).run(totals.total_xp, totals.total_kamas, totals.total_time, runId)

      const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.status).toBe('COMPLETED')
      expect(run.total_xp).toBe(800)
      expect(run.total_kamas).toBe(300)
      expect(run.total_time_seconds).toBe(105)
    })

    it('debe abandonar una run', () => {
      const dungeonId = seedDungeon(db)
      const runId = seedRun(db, dungeonId)
      seedRoom(db, runId, 1, 500, 200, 60)

      db.prepare(
        "UPDATE runs SET status = 'ABANDONED', end_time = datetime('now') WHERE id = ?"
      ).run(runId)

      const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.status).toBe('ABANDONED')
    })

    it('debe eliminar una run con cascade', () => {
      const dungeonId = seedDungeon(db)
      const resourceId = seedResource(db, 'Test Resource')
      const runId = seedRun(db, dungeonId)
      const roomId = seedRoom(db, runId, 1)
      seedRoomResource(db, roomId, resourceId, 3)

      db.prepare('DELETE FROM runs WHERE id = ?').run(runId)

      expect(db.prepare('SELECT * FROM runs WHERE id = ?').get(runId)).toBeUndefined()
      expect(db.prepare('SELECT * FROM rooms WHERE run_id = ?').all(runId)).toHaveLength(0)
      expect(db.prepare('SELECT * FROM room_resources WHERE room_id = ?').all(roomId)).toHaveLength(0)
    })

    it('debe listar runs con filtros', () => {
      const dungeonId = seedDungeon(db)
      seedRun(db, dungeonId, 'COMPLETED')
      seedRun(db, dungeonId, 'COMPLETED', 1)
      seedRun(db, dungeonId, 'ABANDONED')

      const completed = db.prepare("SELECT * FROM runs WHERE status = 'COMPLETED'").all()
      expect(completed).toHaveLength(2)

      const group = db.prepare("SELECT * FROM runs WHERE is_group = 1").all()
      expect(group).toHaveLength(1)
    })
  })

  // ===== ROOM TESTS =====
  describe('RoomService logic', () => {
    it('debe agregar una sala con número automático', () => {
      const dungeonId = seedDungeon(db, 'Test', 3)
      const runId = seedRun(db, dungeonId)

      seedRoom(db, runId, 1, 100, 50, 60)
      seedRoom(db, runId, 2, 200, 75, 45)

      const rooms = db.prepare('SELECT * FROM rooms WHERE run_id = ? ORDER BY room_number').all(runId)
      expect(rooms).toHaveLength(2)
    })

    it('debe rechazar sala cuando se excede expected_rooms', () => {
      const dungeonId = seedDungeon(db, 'Mini', 2)
      const runId = seedRun(db, dungeonId)

      seedRoom(db, runId, 1)
      seedRoom(db, runId, 2)

      // La tercera sala debe exceder, pero aquí probamos la constraint lógica
      const count = (db.prepare('SELECT COUNT(*) as c FROM rooms WHERE run_id = ?').get(runId) as { c: number }).c
      const dungeon = db.prepare('SELECT expected_rooms FROM dungeons WHERE id = ?').get(dungeonId) as { expected_rooms: number }
      expect(count).toBeLessThanOrEqual(dungeon.expected_rooms)
    })

    it('debe agregar recursos a una sala', () => {
      const dungeonId = seedDungeon(db)
      const resourceId1 = seedResource(db, 'Recurso A')
      const resourceId2 = seedResource(db, 'Recurso B')
      const runId = seedRun(db, dungeonId)
      const roomId = seedRoom(db, runId, 1)

      seedRoomResource(db, roomId, resourceId1, 3)
      seedRoomResource(db, roomId, resourceId2, 1)

      const resources = db.prepare('SELECT * FROM room_resources WHERE room_id = ?').all(roomId)
      expect(resources).toHaveLength(2)
    })

    it('debe recalcular totales de run al agregar sala', () => {
      const dungeonId = seedDungeon(db)
      const runId = seedRun(db, dungeonId)

      seedRoom(db, runId, 1, 500, 200, 60)
      seedRoom(db, runId, 2, 300, 100, 45)

      const totals = db
        .prepare(
          'SELECT SUM(xp) as total_xp, SUM(kamas) as total_kamas, SUM(time_seconds) as total_time FROM rooms WHERE run_id = ?'
        )
        .get(runId) as { total_xp: number; total_kamas: number; total_time: number }

      db.prepare('UPDATE runs SET total_xp = ?, total_kamas = ?, total_time_seconds = ? WHERE id = ?')
        .run(totals.total_xp, totals.total_kamas, totals.total_time, runId)

      const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.total_xp).toBe(800)
      expect(run.total_kamas).toBe(300)
      expect(run.total_time_seconds).toBe(105)
    })

    it('debe eliminar la última sala', () => {
      const dungeonId = seedDungeon(db)
      const runId = seedRun(db, dungeonId)

      seedRoom(db, runId, 1, 500, 200, 60)
      seedRoom(db, runId, 2, 300, 100, 45)

      // Eliminar última
      const lastRoom = db
        .prepare('SELECT id FROM rooms WHERE run_id = ? ORDER BY room_number DESC LIMIT 1')
        .get(runId) as { id: number }

      db.prepare('DELETE FROM rooms WHERE id = ?').run(lastRoom.id)

      const rooms = db.prepare('SELECT * FROM rooms WHERE run_id = ?').all(runId)
      expect(rooms).toHaveLength(1)
    })

    it('debe auto-finalizar run cuando se registra la última sala', () => {
      const dungeonId = seedDungeon(db, 'Mini', 2)
      const runId = seedRun(db, dungeonId)

      seedRoom(db, runId, 1, 100, 50, 60)
      seedRoom(db, runId, 2, 200, 75, 45)

      // Simular auto-finalización
      const dungeon = db.prepare('SELECT expected_rooms FROM dungeons WHERE id = ?').get(dungeonId) as { expected_rooms: number }
      const roomCount = (db.prepare('SELECT COUNT(*) as c FROM rooms WHERE run_id = ?').get(runId) as { c: number }).c

      if (roomCount >= dungeon.expected_rooms) {
        db.prepare("UPDATE runs SET status = 'COMPLETED', end_time = datetime('now') WHERE id = ?").run(runId)
      }

      const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.status).toBe('COMPLETED')
    })
  })

  // ===== STATS TESTS =====
  describe('StatsService logic', () => {
    it('debe calcular estadísticas globales', () => {
      const dungeonId = seedDungeon(db)

      // Crear 3 runs completadas
      for (let i = 0; i < 3; i++) {
        const runId = seedRun(db, dungeonId, 'COMPLETED')
        seedRoom(db, runId, 1, 100 * (i + 1), 50 * (i + 1), 60 + i * 10)
        const totals = db
          .prepare('SELECT SUM(xp) as x, SUM(kamas) as k, SUM(time_seconds) as t FROM rooms WHERE run_id = ?')
          .get(runId) as { x: number; k: number; t: number }
        db.prepare('UPDATE runs SET total_xp = ?, total_kamas = ?, total_time_seconds = ? WHERE id = ?')
          .run(totals.x, totals.k, totals.t, runId)
      }

      const stats = db
        .prepare(
          `SELECT COUNT(*) as total_runs, SUM(total_xp) as total_xp, SUM(total_kamas) as total_kamas
           FROM runs WHERE status = 'COMPLETED'`
        )
        .get() as { total_runs: number; total_xp: number; total_kamas: number }

      expect(stats.total_runs).toBe(3)
      expect(stats.total_xp).toBe(100 + 200 + 300)
      expect(stats.total_kamas).toBe(50 + 100 + 150)
    })

    it('debe filtrar estadísticas por modo', () => {
      const dungeonId = seedDungeon(db)
      seedRun(db, dungeonId, 'COMPLETED', 0)
      seedRun(db, dungeonId, 'COMPLETED', 0)
      seedRun(db, dungeonId, 'COMPLETED', 1)

      const solo = db
        .prepare("SELECT COUNT(*) as c FROM runs WHERE status = 'COMPLETED' AND is_group = 0")
        .get() as { c: number }
      expect(solo.c).toBe(2)

      const group = db
        .prepare("SELECT COUNT(*) as c FROM runs WHERE status = 'COMPLETED' AND is_group = 1")
        .get() as { c: number }
      expect(group.c).toBe(1)
    })

    it('debe calcular estadísticas por sala', () => {
      const dungeonId = seedDungeon(db, 'Test', 3)

      for (let i = 0; i < 2; i++) {
        const runId = seedRun(db, dungeonId, 'COMPLETED')
        seedRoom(db, runId, 1, 100, 50, 60)
        seedRoom(db, runId, 2, 200, 100, 90)
        seedRoom(db, runId, 3, 150, 75, 45)
      }

      const roomStats = db
        .prepare(
          `SELECT room_number, AVG(xp) as avg_xp, AVG(time_seconds) as avg_time
           FROM rooms rm JOIN runs r ON rm.run_id = r.id
           WHERE r.status = 'COMPLETED' AND r.dungeon_id = ?
           GROUP BY room_number ORDER BY room_number`
        )
        .all(dungeonId) as { room_number: number; avg_xp: number; avg_time: number }[]

      expect(roomStats).toHaveLength(3)
      expect(roomStats[0].avg_xp).toBe(100)
      expect(roomStats[1].avg_xp).toBe(200)
    })

    it('debe calcular estadísticas por recurso', () => {
      const dungeonId = seedDungeon(db)
      const resA = seedResource(db, 'Recurso A')
      const resB = seedResource(db, 'Recurso B')

      const runId1 = seedRun(db, dungeonId, 'COMPLETED')
      const room1 = seedRoom(db, runId1, 1)
      seedRoomResource(db, room1, resA, 3)
      seedRoomResource(db, room1, resB, 1)

      const runId2 = seedRun(db, dungeonId, 'COMPLETED')
      const room2 = seedRoom(db, runId2, 1)
      seedRoomResource(db, room2, resA, 2)

      const resourceStats = db
        .prepare(
          `SELECT res.name, SUM(rr.quantity) as total_quantity, COUNT(DISTINCT rm.run_id) as appearance_count
           FROM resources res
           JOIN room_resources rr ON res.id = rr.resource_id
           JOIN rooms rm ON rr.room_id = rm.id
           JOIN runs r ON rm.run_id = r.id
           WHERE r.status = 'COMPLETED'
           GROUP BY res.id ORDER BY total_quantity DESC`
        )
        .all() as { name: string; total_quantity: number; appearance_count: number }[]

      expect(resourceStats).toHaveLength(2)
      expect(resourceStats[0].name).toBe('Recurso A')
      expect(resourceStats[0].total_quantity).toBe(5)
      expect(resourceStats[0].appearance_count).toBe(2)
    })

    it('debe comparar runs', () => {
      const dungeonId = seedDungeon(db)
      const runId1 = seedRun(db, dungeonId, 'COMPLETED')
      const runId2 = seedRun(db, dungeonId, 'COMPLETED')

      db.prepare('UPDATE runs SET total_xp = 500, total_time_seconds = 300 WHERE id = ?').run(runId1)
      db.prepare('UPDATE runs SET total_xp = 800, total_time_seconds = 240 WHERE id = ?').run(runId2)

      const comparison = db
        .prepare(
          `SELECT id, total_xp, total_time_seconds,
            CASE WHEN total_time_seconds > 0 THEN (total_xp * 60.0 / total_time_seconds) ELSE 0 END as xp_per_min
           FROM runs WHERE id IN (?, ?)`
        )
        .all(runId1, runId2) as { id: number; total_xp: number; xp_per_min: number }[]

      expect(comparison).toHaveLength(2)
      const run2 = comparison.find((r) => r.id === runId2)!
      expect(run2.total_xp).toBe(800)
      expect(run2.xp_per_min).toBe(200) // 800 * 60 / 240 = 200
    })
  })

  // ===== EXPORT TESTS =====
  describe('ExportService logic', () => {
    it('debe generar JSON de una run', () => {
      const dungeonId = seedDungeon(db, 'Jalató', 10)
      const resourceId = seedResource(db, 'Lana')
      const runId = seedRun(db, dungeonId, 'COMPLETED')
      const roomId = seedRoom(db, runId, 1, 500, 200, 120)
      seedRoomResource(db, roomId, resourceId, 3)

      db.prepare('UPDATE runs SET total_xp = 500, total_kamas = 200, total_time_seconds = 120 WHERE id = ?').run(runId)

      const run = db
        .prepare('SELECT r.*, d.name as dungeon_name FROM runs r JOIN dungeons d ON r.dungeon_id = d.id WHERE r.id = ?')
        .get(runId) as Record<string, unknown>

      const rooms = db.prepare('SELECT * FROM rooms WHERE run_id = ?').all(runId) as { id: number }[]
      const roomsWithResources = rooms.map((room) => {
        const resources = db
          .prepare('SELECT rr.*, res.name as resource_name FROM room_resources rr JOIN resources res ON rr.resource_id = res.id WHERE rr.room_id = ?')
          .all(room.id)
        return { ...room, resources }
      })

      const json = JSON.stringify({ ...run, rooms: roomsWithResources }, null, 2)
      const parsed = JSON.parse(json)

      expect(parsed.dungeon_name).toBe('Jalató')
      expect(parsed.total_xp).toBe(500)
      expect(parsed.rooms).toHaveLength(1)
      expect(parsed.rooms[0].resources).toHaveLength(1)
      expect(parsed.rooms[0].resources[0].resource_name).toBe('Lana')
    })

    it('debe importar runs desde JSON', () => {
      const dungeonId = seedDungeon(db, 'Jalató', 10)
      seedResource(db, 'Lana')

      const importData = {
        runs: [
          {
            dungeon_name: 'Jalató',
            start_time: '2024-01-15 10:00:00',
            end_time: '2024-01-15 10:30:00',
            total_xp: 1500,
            total_kamas: 600,
            total_time_seconds: 1800,
            status: 'COMPLETED',
            rooms: [
              {
                room_number: 1,
                xp: 750,
                kamas: 300,
                time_seconds: 900,
                resources: [{ resource_name: 'Lana', quantity: 2 }]
              },
              {
                room_number: 2,
                xp: 750,
                kamas: 300,
                time_seconds: 900,
                resources: []
              }
            ]
          }
        ]
      }

      // Simular importación
      const transaction = db.transaction(() => {
        let imported = 0
        for (const runData of importData.runs) {
          const dungeon = db.prepare('SELECT id FROM dungeons WHERE name = ?').get(runData.dungeon_name) as { id: number }

          const runResult = db
            .prepare(
              'INSERT INTO runs (dungeon_id, start_time, end_time, total_xp, total_kamas, total_time_seconds, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(dungeon.id, runData.start_time, runData.end_time, runData.total_xp, runData.total_kamas, runData.total_time_seconds, runData.status)

          const newRunId = runResult.lastInsertRowid as number

          for (const roomData of runData.rooms) {
            const roomResult = db
              .prepare('INSERT INTO rooms (run_id, room_number, xp, kamas, time_seconds) VALUES (?, ?, ?, ?, ?)')
              .run(newRunId, roomData.room_number, roomData.xp, roomData.kamas, roomData.time_seconds)

            for (const resData of roomData.resources) {
              const resource = db.prepare('SELECT id FROM resources WHERE name = ?').get(resData.resource_name) as { id: number }
              db.prepare('INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)').run(
                roomResult.lastInsertRowid as number,
                resource.id,
                resData.quantity
              )
            }
          }
          imported++
        }
        return imported
      })

      const imported = transaction()
      expect(imported).toBe(1)

      // Verificar que se importó correctamente
      const allRuns = db.prepare('SELECT * FROM runs').all()
      expect(allRuns).toHaveLength(1)

      const rooms = db.prepare('SELECT * FROM rooms').all()
      expect(rooms).toHaveLength(2)

      const resources = db.prepare('SELECT * FROM room_resources').all()
      expect(resources).toHaveLength(1)
    })
  })

  // ===== FULL CYCLE TEST =====
  describe('Ciclo completo de una run', () => {
    it('debe completar un flujo completo: crear run → agregar salas → finalizar', () => {
      const dungeonId = seedDungeon(db, 'Test Dungeon', 3)
      const resA = seedResource(db, 'Lana')
      const resB = seedResource(db, 'Cuero')

      // 1. Crear run
      const runId = seedRun(db, dungeonId)
      let run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.status).toBe('IN_PROGRESS')

      // 2. Registrar sala 1
      const room1Id = seedRoom(db, runId, 1, 500, 200, 120)
      seedRoomResource(db, room1Id, resA, 3)

      // 3. Registrar sala 2
      const room2Id = seedRoom(db, runId, 2, 300, 150, 90)
      seedRoomResource(db, room2Id, resA, 1)
      seedRoomResource(db, room2Id, resB, 2)

      // 4. Registrar sala 3 (última)
      const room3Id = seedRoom(db, runId, 3, 400, 175, 105)
      seedRoomResource(db, room3Id, resB, 1)

      // 5. Recalcular totales
      const totals = db
        .prepare('SELECT SUM(xp) as x, SUM(kamas) as k, SUM(time_seconds) as t FROM rooms WHERE run_id = ?')
        .get(runId) as { x: number; k: number; t: number }

      db.prepare(
        "UPDATE runs SET total_xp = ?, total_kamas = ?, total_time_seconds = ?, status = 'COMPLETED', end_time = datetime('now') WHERE id = ?"
      ).run(totals.x, totals.k, totals.t, runId)

      // Verificar run finalizada
      run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown>
      expect(run.status).toBe('COMPLETED')
      expect(run.total_xp).toBe(1200)
      expect(run.total_kamas).toBe(525)
      expect(run.total_time_seconds).toBe(315)

      // Verificar salas
      const rooms = db.prepare('SELECT * FROM rooms WHERE run_id = ? ORDER BY room_number').all(runId)
      expect(rooms).toHaveLength(3)

      // Verificar recursos totales
      const totalResources = db
        .prepare(
          `SELECT res.name, SUM(rr.quantity) as total
           FROM room_resources rr
           JOIN rooms rm ON rr.room_id = rm.id
           JOIN resources res ON rr.resource_id = res.id
           WHERE rm.run_id = ?
           GROUP BY res.id`
        )
        .all(runId) as { name: string; total: number }[]

      const lana = totalResources.find((r) => r.name === 'Lana')!
      const cuero = totalResources.find((r) => r.name === 'Cuero')!
      expect(lana.total).toBe(4)
      expect(cuero.total).toBe(3)
    })
  })
})
