import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  const dbDir = join(dbPath, '..')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)

  // Habilitar foreign keys y WAL mode para mejor rendimiento
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  return db
}

function getDbPath(): string {
  if (is.dev) {
    // Dev: database_dev.db en la raíz del proyecto
    return join(process.cwd(), 'database_dev.db')
  }
  // Prod: database.db en userData de Electron
  return join(app.getPath('userData'), 'database.db')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
