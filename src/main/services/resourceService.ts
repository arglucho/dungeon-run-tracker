import { getDatabase } from '../database'

interface ResourceRow {
  id: number
  name: string
  created_at: string
  is_active: number
}

export const resourceService = {
  getAll(): ResourceRow[] {
    const db = getDatabase()
    return db
      .prepare('SELECT * FROM resources WHERE is_active = 1 ORDER BY name ASC')
      .all() as ResourceRow[]
  },

  search(query: string): ResourceRow[] {
    const db = getDatabase()
    if (!query || query.trim().length === 0) return this.getAll()
    return db
      .prepare('SELECT * FROM resources WHERE is_active = 1 AND name LIKE ? ORDER BY name ASC')
      .all(`%${query.trim()}%`) as ResourceRow[]
  },

  create(input: { name: string }): { id: number } {
    const db = getDatabase()

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('El nombre del recurso es obligatorio')
    }

    // Verificar nombre único (incluyendo inactivos para evitar confusión)
    const existing = db
      .prepare('SELECT id, is_active FROM resources WHERE LOWER(name) = LOWER(?)')
      .get(input.name.trim()) as { id: number; is_active: number } | undefined

    if (existing) {
      if (existing.is_active === 0) {
        // Reactivar recurso existente
        db.prepare('UPDATE resources SET is_active = 1, name = ? WHERE id = ?').run(
          input.name.trim(),
          existing.id
        )
        return { id: existing.id }
      }
      throw new Error('Ya existe un recurso con ese nombre')
    }

    const result = db
      .prepare('INSERT INTO resources (name) VALUES (?)')
      .run(input.name.trim())

    return { id: result.lastInsertRowid as number }
  },

  update(id: number, input: { name: string }): void {
    const db = getDatabase()
    const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND is_active = 1').get(id)
    if (!resource) throw new Error('Recurso no encontrado')

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('El nombre del recurso es obligatorio')
    }

    // Verificar nombre único
    const existing = db
      .prepare('SELECT id FROM resources WHERE LOWER(name) = LOWER(?) AND id != ?')
      .get(input.name.trim(), id)

    if (existing) throw new Error('Ya existe un recurso con ese nombre')

    db.prepare('UPDATE resources SET name = ? WHERE id = ?').run(input.name.trim(), id)
  },

  delete(id: number): void {
    const db = getDatabase()
    const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND is_active = 1').get(id)
    if (!resource) throw new Error('Recurso no encontrado')

    // Verificar si está en uso
    const inUse = db
      .prepare('SELECT COUNT(*) as count FROM room_resources WHERE resource_id = ?')
      .get(id) as { count: number }

    if (inUse.count > 0) {
      // Soft delete si está en uso
      db.prepare('UPDATE resources SET is_active = 0 WHERE id = ?').run(id)
    } else {
      // Hard delete si no está en uso
      db.prepare('DELETE FROM resources WHERE id = ?').run(id)
    }
  }
}
