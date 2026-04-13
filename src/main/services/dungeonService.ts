import { getDatabase } from '../database'

interface DungeonRow {
  id: number
  name: string
  expected_rooms: number
  description: string | null
  created_at: string
}

interface CreateInput {
  name: string
  expected_rooms: number
  description?: string
}

interface UpdateInput {
  name?: string
  expected_rooms?: number
  description?: string
}

export const dungeonService = {
  getAll(): DungeonRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM dungeons ORDER BY name ASC').all() as DungeonRow[]
  },

  getById(id: number): DungeonRow | null {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM dungeons WHERE id = ?').get(id) as DungeonRow) || null
  },

  create(input: CreateInput): { id: number } {
    const db = getDatabase()

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('El nombre de la mazmorra es obligatorio')
    }
    if (!input.expected_rooms || input.expected_rooms < 1) {
      throw new Error('El número de salas esperadas debe ser al menos 1')
    }

    const result = db
      .prepare('INSERT INTO dungeons (name, expected_rooms, description) VALUES (?, ?, ?)')
      .run(input.name.trim(), input.expected_rooms, input.description?.trim() || null)

    return { id: result.lastInsertRowid as number }
  },

  update(id: number, input: UpdateInput): void {
    const db = getDatabase()
    const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(id)
    if (!dungeon) throw new Error('Mazmorra no encontrada')

    const fields: string[] = []
    const values: unknown[] = []

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) throw new Error('El nombre no puede estar vacío')
      fields.push('name = ?')
      values.push(input.name.trim())
    }
    if (input.expected_rooms !== undefined) {
      if (input.expected_rooms < 1)
        throw new Error('El número de salas esperadas debe ser al menos 1')
      fields.push('expected_rooms = ?')
      values.push(input.expected_rooms)
    }
    if (input.description !== undefined) {
      fields.push('description = ?')
      values.push(input.description?.trim() || null)
    }

    if (fields.length === 0) return

    values.push(id)
    db.prepare(`UPDATE dungeons SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  delete(id: number): void {
    const db = getDatabase()
    const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(id)
    if (!dungeon) throw new Error('Mazmorra no encontrada')

    // Check if any runs reference this dungeon
    const runCount = db
      .prepare('SELECT COUNT(*) as count FROM runs WHERE dungeon_id = ?')
      .get(id) as { count: number }
    if (runCount.count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${runCount.count} run${runCount.count > 1 ? 's' : ''} asociada${runCount.count > 1 ? 's' : ''} a esta mazmorra`
      )
    }

    db.prepare('DELETE FROM dungeons WHERE id = ?').run(id)
  }
}
