import { getDatabase } from './database'

export function runMigrations(): void {
  const db = getDatabase()

  const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as
    | { version: number | null }
    | undefined

  const version = currentVersion?.version ?? 0

  // Futuras migraciones se agregan aquí con el patrón:
  // if (version < 2) { ... migrate to v2 ... }

  if (version < 1) {
    // Versión 1 ya se crea en schema.ts (initializeDatabase)
    // Este bloque existe por consistencia
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (?)').run(1)
  }

  // Ejemplo para futuras migraciones:
  // if (version < 2) {
  //   db.exec(`ALTER TABLE runs ADD COLUMN difficulty TEXT DEFAULT 'NORMAL'`)
  //   db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(2)
  // }
}
