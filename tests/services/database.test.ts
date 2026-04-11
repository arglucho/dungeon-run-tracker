import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, unlinkSync } from 'fs'

const TEST_DB_PATH = join(process.cwd(), 'database_test.db')

function createTestDb(): Database.Database {
  // Eliminar base de test anterior si existe
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }

  const db = new Database(TEST_DB_PATH)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  // Crear esquema completo
  db.exec(`
    CREATE TABLE IF NOT EXISTS dungeons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      expected_rooms INTEGER NOT NULL CHECK(expected_rooms >= 1),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dungeon_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      total_time_seconds INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      total_kamas INTEGER DEFAULT 0,
      is_group INTEGER DEFAULT 0 CHECK(is_group IN (0, 1)),
      notes TEXT,
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  return db
}

describe('Database Schema', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH)
    }
    // Limpiar archivos WAL/SHM
    const walPath = TEST_DB_PATH + '-wal'
    const shmPath = TEST_DB_PATH + '-shm'
    if (existsSync(walPath)) unlinkSync(walPath)
    if (existsSync(shmPath)) unlinkSync(shmPath)
  })

  describe('Tablas', () => {
    it('debe crear todas las tablas correctamente', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[]

      const tableNames = tables.map((t) => t.name)
      expect(tableNames).toContain('dungeons')
      expect(tableNames).toContain('resources')
      expect(tableNames).toContain('runs')
      expect(tableNames).toContain('rooms')
      expect(tableNames).toContain('room_resources')
      expect(tableNames).toContain('schema_version')
    })
  })

  describe('Dungeons', () => {
    it('debe insertar una mazmorra correctamente', () => {
      const result = db
        .prepare('INSERT INTO dungeons (name, expected_rooms, description) VALUES (?, ?, ?)')
        .run('Mazmorra Jalató', 10, 'Mazmorra de prueba')

      expect(result.changes).toBe(1)
      expect(result.lastInsertRowid).toBe(1)
    })

    it('debe rechazar expected_rooms < 1', () => {
      expect(() => {
        db.prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)').run('Test', 0)
      }).toThrow()
    })
  })

  describe('Resources', () => {
    it('debe insertar un recurso correctamente', () => {
      const result = db.prepare('INSERT INTO resources (name) VALUES (?)').run('Lana de jalatín')
      expect(result.changes).toBe(1)
    })

    it('debe rechazar nombres duplicados', () => {
      db.prepare('INSERT INTO resources (name) VALUES (?)').run('Lana de jalatín')
      expect(() => {
        db.prepare('INSERT INTO resources (name) VALUES (?)').run('Lana de jalatín')
      }).toThrow()
    })

    it('debe tener is_active = 1 por defecto', () => {
      db.prepare('INSERT INTO resources (name) VALUES (?)').run('Recurso Test')
      const resource = db.prepare('SELECT is_active FROM resources WHERE name = ?').get('Recurso Test') as { is_active: number }
      expect(resource.is_active).toBe(1)
    })

    it('debe permitir soft delete (is_active = 0)', () => {
      db.prepare('INSERT INTO resources (name) VALUES (?)').run('Recurso Test')
      db.prepare('UPDATE resources SET is_active = 0 WHERE name = ?').run('Recurso Test')
      const resource = db.prepare('SELECT is_active FROM resources WHERE name = ?').get('Recurso Test') as { is_active: number }
      expect(resource.is_active).toBe(0)
    })
  })

  describe('Runs', () => {
    beforeEach(() => {
      db.prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)').run('Jalató', 10)
    })

    it('debe crear una run con estado IN_PROGRESS por defecto', () => {
      db.prepare(`INSERT INTO runs (dungeon_id, start_time) VALUES (?, datetime('now'))`).run(1)
      const run = db.prepare('SELECT status FROM runs WHERE id = 1').get() as { status: string }
      expect(run.status).toBe('IN_PROGRESS')
    })

    it('debe rechazar un status inválido', () => {
      expect(() => {
        db.prepare(`INSERT INTO runs (dungeon_id, start_time, status) VALUES (?, datetime('now'), ?)`).run(1, 'INVALID')
      }).toThrow()
    })

    it('debe aceptar status ABANDONED', () => {
      db.prepare(`INSERT INTO runs (dungeon_id, start_time, status) VALUES (?, datetime('now'), ?)`).run(1, 'ABANDONED')
      const run = db.prepare('SELECT status FROM runs WHERE id = 1').get() as { status: string }
      expect(run.status).toBe('ABANDONED')
    })

    it('debe aceptar status COMPLETED', () => {
      db.prepare(`INSERT INTO runs (dungeon_id, start_time, status) VALUES (?, datetime('now'), ?)`).run(1, 'COMPLETED')
      const run = db.prepare('SELECT status FROM runs WHERE id = 1').get() as { status: string }
      expect(run.status).toBe('COMPLETED')
    })

    it('debe rechazar dungeon_id con foreign key inválida', () => {
      expect(() => {
        db.prepare(`INSERT INTO runs (dungeon_id, start_time) VALUES (?, datetime('now'))`).run(999)
      }).toThrow()
    })
  })

  describe('Rooms', () => {
    beforeEach(() => {
      db.prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)').run('Jalató', 10)
      db.prepare(`INSERT INTO runs (dungeon_id, start_time) VALUES (?, datetime('now'))`).run(1)
    })

    it('debe insertar una sala correctamente', () => {
      const result = db
        .prepare('INSERT INTO rooms (run_id, room_number, time_seconds, xp, kamas) VALUES (?, ?, ?, ?, ?)')
        .run(1, 1, 120, 5000, 1000)

      expect(result.changes).toBe(1)
    })

    it('debe rechazar time_seconds negativo', () => {
      expect(() => {
        db.prepare('INSERT INTO rooms (run_id, room_number, time_seconds) VALUES (?, ?, ?)').run(1, 1, -1)
      }).toThrow()
    })

    it('debe rechazar xp negativa', () => {
      expect(() => {
        db.prepare('INSERT INTO rooms (run_id, room_number, xp) VALUES (?, ?, ?)').run(1, 1, -100)
      }).toThrow()
    })

    it('debe rechazar kamas negativas', () => {
      expect(() => {
        db.prepare('INSERT INTO rooms (run_id, room_number, kamas) VALUES (?, ?, ?)').run(1, 1, -50)
      }).toThrow()
    })

    it('debe permitir turns null (opcional)', () => {
      db.prepare('INSERT INTO rooms (run_id, room_number) VALUES (?, ?)').run(1, 1)
      const room = db.prepare('SELECT turns FROM rooms WHERE id = 1').get() as { turns: number | null }
      expect(room.turns).toBeNull()
    })
  })

  describe('Room Resources', () => {
    beforeEach(() => {
      db.prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)').run('Jalató', 10)
      db.prepare(`INSERT INTO runs (dungeon_id, start_time) VALUES (?, datetime('now'))`).run(1)
      db.prepare('INSERT INTO rooms (run_id, room_number) VALUES (?, ?)').run(1, 1)
      db.prepare('INSERT INTO resources (name) VALUES (?)').run('Lana de jalatín')
    })

    it('debe insertar un recurso de sala correctamente', () => {
      const result = db
        .prepare('INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)')
        .run(1, 1, 3)

      expect(result.changes).toBe(1)
    })

    it('debe rechazar quantity < 1', () => {
      expect(() => {
        db.prepare('INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)').run(1, 1, 0)
      }).toThrow()
    })
  })

  describe('ON DELETE CASCADE', () => {
    beforeEach(() => {
      db.prepare('INSERT INTO dungeons (name, expected_rooms) VALUES (?, ?)').run('Jalató', 10)
      db.prepare(`INSERT INTO runs (dungeon_id, start_time) VALUES (?, datetime('now'))`).run(1)
      db.prepare('INSERT INTO rooms (run_id, room_number) VALUES (?, ?)').run(1, 1)
      db.prepare('INSERT INTO resources (name) VALUES (?)').run('Lana de jalatín')
      db.prepare('INSERT INTO room_resources (room_id, resource_id, quantity) VALUES (?, ?, ?)').run(1, 1, 5)
    })

    it('debe eliminar rooms al eliminar una run (CASCADE)', () => {
      // Verificar que hay rooms
      const roomsBefore = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE run_id = 1').get() as { count: number }
      expect(roomsBefore.count).toBe(1)

      // Eliminar la run
      db.prepare('DELETE FROM runs WHERE id = 1').run()

      // Verificar que rooms se eliminaron
      const roomsAfter = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE run_id = 1').get() as { count: number }
      expect(roomsAfter.count).toBe(0)
    })

    it('debe eliminar room_resources al eliminar una room (CASCADE)', () => {
      const resBefore = db.prepare('SELECT COUNT(*) as count FROM room_resources WHERE room_id = 1').get() as { count: number }
      expect(resBefore.count).toBe(1)

      db.prepare('DELETE FROM rooms WHERE id = 1').run()

      const resAfter = db.prepare('SELECT COUNT(*) as count FROM room_resources WHERE room_id = 1').get() as { count: number }
      expect(resAfter.count).toBe(0)
    })

    it('debe eliminar room_resources al eliminar una run (CASCADE doble)', () => {
      const resBefore = db.prepare('SELECT COUNT(*) as count FROM room_resources').get() as { count: number }
      expect(resBefore.count).toBe(1)

      db.prepare('DELETE FROM runs WHERE id = 1').run()

      const resAfter = db.prepare('SELECT COUNT(*) as count FROM room_resources').get() as { count: number }
      expect(resAfter.count).toBe(0)
    })
  })

  describe('Seed Data', () => {
    it('debe poder insertar seed data de Jalató', () => {
      const transaction = db.transaction(() => {
        db.prepare('INSERT INTO dungeons (name, expected_rooms, description) VALUES (?, ?, ?)').run(
          'Mazmorra Jalató',
          10,
          'Mazmorra de Jalató en Dofus Retro'
        )

        const resources = ['Lana de jalatín blanco', 'Cuero de jalatín negro', 'Baba de jalató']
        for (const name of resources) {
          db.prepare('INSERT INTO resources (name) VALUES (?)').run(name)
        }
      })

      transaction()

      const dungeon = db.prepare('SELECT * FROM dungeons WHERE name = ?').get('Mazmorra Jalató') as { expected_rooms: number }
      expect(dungeon.expected_rooms).toBe(10)

      const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get() as { count: number }
      expect(resourceCount.count).toBe(3)
    })
  })
})
