import { getDatabase } from '../database'

type RunStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

interface RunRow {
  id: number
  dungeon_id: number
  start_time: string
  end_time: string | null
  total_time_seconds: number
  total_xp: number
  total_kamas: number
  is_group: number
  notes: string | null
  status: RunStatus
  created_at: string
}

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

interface RunWithDetails extends RunRow {
  dungeon_name: string
  expected_rooms: number
  rooms: (RoomRow & { resources: RoomResourceRow[] })[]
}

interface CreateInput {
  dungeon_id: number
  is_group: boolean
  notes?: string
}

interface UpdateInput {
  is_group?: boolean
  notes?: string
}

interface RunFilters {
  dungeon_id?: number
  status?: RunStatus
  is_group?: boolean
  date_from?: string
  date_to?: string
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

function getRoomsWithResources(runId: number): (RoomRow & { resources: RoomResourceRow[] })[] {
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

export const runService = {
  create(input: CreateInput): { id: number } {
    const db = getDatabase()

    // Validar que no exista otra run activa
    const active = db
      .prepare("SELECT id FROM runs WHERE status = 'IN_PROGRESS'")
      .get() as { id: number } | undefined

    if (active) {
      throw new Error('Ya existe una run en progreso. Finalizala o abandonala antes de crear una nueva.')
    }

    // Validar que la mazmorra exista
    const dungeon = db.prepare('SELECT id FROM dungeons WHERE id = ?').get(input.dungeon_id)
    if (!dungeon) throw new Error('La mazmorra seleccionada no existe')

    const result = db
      .prepare(
        `INSERT INTO runs (dungeon_id, start_time, is_group, notes, status)
         VALUES (?, datetime('now'), ?, ?, 'IN_PROGRESS')`
      )
      .run(input.dungeon_id, input.is_group ? 1 : 0, input.notes?.trim() || null)

    return { id: result.lastInsertRowid as number }
  },

  getActive(): RunWithDetails | null {
    const db = getDatabase()
    const run = db
      .prepare(
        `SELECT r.*, d.name as dungeon_name, d.expected_rooms
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         WHERE r.status = 'IN_PROGRESS'
         LIMIT 1`
      )
      .get() as (RunRow & { dungeon_name: string; expected_rooms: number }) | undefined

    if (!run) return null

    const rooms = getRoomsWithResources(run.id)
    return { ...run, rooms }
  },

  getAll(filters?: RunFilters): RunRow[] {
    const db = getDatabase()
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters?.dungeon_id) {
      conditions.push('r.dungeon_id = ?')
      params.push(filters.dungeon_id)
    }
    if (filters?.status) {
      conditions.push('r.status = ?')
      params.push(filters.status)
    }
    if (filters?.is_group !== undefined) {
      conditions.push('r.is_group = ?')
      params.push(filters.is_group ? 1 : 0)
    }
    if (filters?.date_from) {
      conditions.push('r.start_time >= ?')
      params.push(filters.date_from)
    }
    if (filters?.date_to) {
      conditions.push('r.start_time <= ?')
      params.push(filters.date_to)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    return db
      .prepare(
        `SELECT r.*, d.name as dungeon_name, d.expected_rooms
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         ${where}
         ORDER BY r.start_time DESC`
      )
      .all(...params) as RunRow[]
  },

  getById(id: number): RunWithDetails {
    const db = getDatabase()
    const run = db
      .prepare(
        `SELECT r.*, d.name as dungeon_name, d.expected_rooms
         FROM runs r
         JOIN dungeons d ON r.dungeon_id = d.id
         WHERE r.id = ?`
      )
      .get(id) as (RunRow & { dungeon_name: string; expected_rooms: number }) | undefined

    if (!run) throw new Error('Run no encontrada')

    const rooms = getRoomsWithResources(run.id)
    return { ...run, rooms }
  },

  finish(id: number): void {
    const db = getDatabase()
    const run = db.prepare('SELECT status FROM runs WHERE id = ?').get(id) as
      | { status: string }
      | undefined

    if (!run) throw new Error('Run no encontrada')
    if (run.status !== 'IN_PROGRESS') throw new Error('Solo se puede finalizar una run en progreso')

    recalculateRunTotals(id)

    db.prepare(
      `UPDATE runs SET status = 'COMPLETED', end_time = datetime('now') WHERE id = ?`
    ).run(id)
  },

  abandon(id: number): void {
    const db = getDatabase()
    const run = db.prepare('SELECT status FROM runs WHERE id = ?').get(id) as
      | { status: string }
      | undefined

    if (!run) throw new Error('Run no encontrada')
    if (run.status !== 'IN_PROGRESS') throw new Error('Solo se puede abandonar una run en progreso')

    recalculateRunTotals(id)

    db.prepare(
      `UPDATE runs SET status = 'ABANDONED', end_time = datetime('now') WHERE id = ?`
    ).run(id)
  },

  delete(id: number): void {
    const db = getDatabase()
    const run = db.prepare('SELECT id FROM runs WHERE id = ?').get(id)
    if (!run) throw new Error('Run no encontrada')

    // CASCADE elimina rooms y room_resources automáticamente
    db.prepare('DELETE FROM runs WHERE id = ?').run(id)
  },

  update(id: number, input: UpdateInput): void {
    const db = getDatabase()
    const run = db.prepare('SELECT id FROM runs WHERE id = ?').get(id)
    if (!run) throw new Error('Run no encontrada')

    const fields: string[] = []
    const values: unknown[] = []

    if (input.is_group !== undefined) {
      fields.push('is_group = ?')
      values.push(input.is_group ? 1 : 0)
    }
    if (input.notes !== undefined) {
      fields.push('notes = ?')
      values.push(input.notes?.trim() || null)
    }

    if (fields.length === 0) return

    values.push(id)
    db.prepare(`UPDATE runs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
}
