import { getDatabase } from './database'

export function initializeDatabase(): void {
  const db = getDatabase()

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

    -- Índices para optimizar consultas frecuentes
    CREATE INDEX IF NOT EXISTS idx_runs_dungeon ON runs(dungeon_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_start_time ON runs(start_time);
    CREATE INDEX IF NOT EXISTS idx_rooms_run ON rooms(run_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_run_number ON rooms(run_id, room_number);
    CREATE INDEX IF NOT EXISTS idx_room_resources_room ON room_resources(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_resources_resource ON room_resources(resource_id);

    -- Tabla de versión del schema para futuras migraciones
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Registrar versión inicial si no existe
  const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as
    | { version: number | null }
    | undefined

  if (!currentVersion || currentVersion.version === null) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1)
  }
}
