import { getDatabase } from './database'

export function runMigrations(): void {
  const db = getDatabase()

  const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as
    | { version: number | null }
    | undefined

  const version = currentVersion?.version ?? 0

  if (version < 1) {
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (?)').run(1)
  }

  if (version < 2) {
    db.exec(`
      ALTER TABLE resources ADD COLUMN image_filename TEXT;
      ALTER TABLE resources ADD COLUMN pods REAL;
      ALTER TABLE resources ADD COLUMN level INTEGER;
      ALTER TABLE resources ADD COLUMN description TEXT;
    `)
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(2)
  }
}
