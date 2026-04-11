import { getDatabase } from '../database'

interface StatsFilters {
  dungeon_id?: number
  is_group?: boolean
  date_from?: string
  date_to?: string
}

function buildWhereClause(filters?: StatsFilters, tableAlias = 'r'): { where: string; params: unknown[] } {
  const conditions: string[] = [`${tableAlias}.status = 'COMPLETED'`]
  const params: unknown[] = []

  if (filters?.dungeon_id) {
    conditions.push(`${tableAlias}.dungeon_id = ?`)
    params.push(filters.dungeon_id)
  }
  if (filters?.is_group !== undefined) {
    conditions.push(`${tableAlias}.is_group = ?`)
    params.push(filters.is_group ? 1 : 0)
  }
  if (filters?.date_from) {
    conditions.push(`${tableAlias}.start_time >= ?`)
    params.push(filters.date_from)
  }
  if (filters?.date_to) {
    conditions.push(`${tableAlias}.start_time <= ?`)
    params.push(filters.date_to)
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', params }
}

export const statsService = {
  getGlobal(filters?: StatsFilters) {
    const db = getDatabase()
    const { where, params } = buildWhereClause(filters)

    const stats = db
      .prepare(
        `SELECT
          COUNT(*) as total_runs,
          COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) as total_completed,
          COUNT(CASE WHEN r.status = 'ABANDONED' THEN 1 END) as total_abandoned,
          COALESCE(SUM(r.total_xp), 0) as total_xp,
          COALESCE(SUM(r.total_kamas), 0) as total_kamas,
          COALESCE(SUM(r.total_time_seconds), 0) as total_time_seconds,
          COALESCE(AVG(r.total_xp), 0) as avg_xp_per_run,
          COALESCE(AVG(r.total_kamas), 0) as avg_kamas_per_run,
          COALESCE(AVG(r.total_time_seconds), 0) as avg_time_per_run
        FROM runs r
        ${where}`
      )
      .get(...params) as Record<string, number>

    // Calcular XP/min y kamas/min promedio
    const avgXpPerMin =
      stats.total_time_seconds > 0
        ? (stats.total_xp / stats.total_time_seconds) * 60
        : 0
    const avgKamasPerMin =
      stats.total_time_seconds > 0
        ? (stats.total_kamas / stats.total_time_seconds) * 60
        : 0

    // Mejor y peor run (por XP/min)
    const bestRun = db
      .prepare(
        `SELECT id, 
          CASE WHEN total_time_seconds > 0 THEN (total_xp * 60.0 / total_time_seconds) ELSE 0 END as xp_per_min
        FROM runs r ${where}
        ORDER BY xp_per_min DESC LIMIT 1`
      )
      .get(...params) as { id: number; xp_per_min: number } | undefined

    const worstRun = db
      .prepare(
        `SELECT id,
          CASE WHEN total_time_seconds > 0 THEN (total_xp * 60.0 / total_time_seconds) ELSE 0 END as xp_per_min
        FROM runs r ${where} AND total_time_seconds > 0
        ORDER BY xp_per_min ASC LIMIT 1`
      )
      .get(...params) as { id: number; xp_per_min: number } | undefined

    // Run más rápida y más lenta
    const fastestRun = db
      .prepare(
        `SELECT id, total_time_seconds
        FROM runs r ${where} AND total_time_seconds > 0
        ORDER BY total_time_seconds ASC LIMIT 1`
      )
      .get(...params) as { id: number; total_time_seconds: number } | undefined

    const slowestRun = db
      .prepare(
        `SELECT id, total_time_seconds
        FROM runs r ${where} AND total_time_seconds > 0
        ORDER BY total_time_seconds DESC LIMIT 1`
      )
      .get(...params) as { id: number; total_time_seconds: number } | undefined

    return {
      ...stats,
      avg_xp_per_minute: avgXpPerMin,
      avg_kamas_per_minute: avgKamasPerMin,
      best_run_id: bestRun?.id ?? null,
      best_run_xp_per_min: bestRun?.xp_per_min ?? 0,
      worst_run_id: worstRun?.id ?? null,
      worst_run_xp_per_min: worstRun?.xp_per_min ?? 0,
      fastest_run_id: fastestRun?.id ?? null,
      fastest_run_time: fastestRun?.total_time_seconds ?? 0,
      slowest_run_id: slowestRun?.id ?? null,
      slowest_run_time: slowestRun?.total_time_seconds ?? 0
    }
  },

  getByRoom(dungeonId: number, filters?: StatsFilters) {
    const db = getDatabase()
    const conditions: string[] = ["r.status = 'COMPLETED'", 'r.dungeon_id = ?']
    const params: unknown[] = [dungeonId]

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

    const where = `WHERE ${conditions.join(' AND ')}`

    return db
      .prepare(
        `SELECT
          rm.room_number,
          AVG(rm.time_seconds) as avg_time,
          AVG(rm.xp) as avg_xp,
          AVG(rm.kamas) as avg_kamas,
          AVG(rm.turns) as avg_turns,
          MIN(rm.time_seconds) as min_time,
          MAX(rm.time_seconds) as max_time
        FROM rooms rm
        JOIN runs r ON rm.run_id = r.id
        ${where}
        GROUP BY rm.room_number
        ORDER BY rm.room_number ASC`
      )
      .all(...params)
  },

  getByResource(filters?: StatsFilters) {
    const db = getDatabase()
    const { where, params } = buildWhereClause(filters)

    const totalRuns = db
      .prepare(`SELECT COUNT(*) as count FROM runs r ${where}`)
      .get(...params) as { count: number }

    return db
      .prepare(
        `SELECT
          res.id as resource_id,
          res.name as resource_name,
          COALESCE(SUM(rr.quantity), 0) as total_quantity,
          COALESCE(AVG(rr.quantity), 0) as avg_per_run,
          COUNT(DISTINCT rm.run_id) as appearance_count,
          CASE WHEN ${totalRuns.count} > 0
            THEN (COUNT(DISTINCT rm.run_id) * 100.0 / ${totalRuns.count})
            ELSE 0 END as appearance_percentage
        FROM resources res
        LEFT JOIN room_resources rr ON res.id = rr.resource_id
        LEFT JOIN rooms rm ON rr.room_id = rm.id
        LEFT JOIN runs r ON rm.run_id = r.id AND r.status = 'COMPLETED'
        WHERE res.is_active = 1
        GROUP BY res.id
        ORDER BY total_quantity DESC`
      )
      .all()
  },

  getTemporal(filters?: StatsFilters) {
    const db = getDatabase()
    const { where, params } = buildWhereClause(filters)

    return db
      .prepare(
        `SELECT
          DATE(r.start_time) as date,
          SUM(r.total_xp) as total_xp,
          SUM(r.total_kamas) as total_kamas,
          SUM(r.total_time_seconds) as total_time_seconds,
          COUNT(*) as run_count,
          CASE WHEN SUM(r.total_time_seconds) > 0
            THEN (SUM(r.total_xp) * 60.0 / SUM(r.total_time_seconds))
            ELSE 0 END as avg_xp_per_minute
        FROM runs r
        ${where}
        GROUP BY DATE(r.start_time)
        ORDER BY date ASC`
      )
      .all(...params)
  },

  compare(runIds: number[]) {
    const db = getDatabase()
    const placeholders = runIds.map(() => '?').join(',')

    const runs = db
      .prepare(
        `SELECT
          r.id, d.name as dungeon_name,
          r.total_xp, r.total_kamas, r.total_time_seconds,
          CASE WHEN r.total_time_seconds > 0
            THEN (r.total_xp * 60.0 / r.total_time_seconds)
            ELSE 0 END as xp_per_minute,
          CASE WHEN r.total_time_seconds > 0
            THEN (r.total_kamas * 60.0 / r.total_time_seconds)
            ELSE 0 END as kamas_per_minute,
          (SELECT COUNT(*) FROM rooms WHERE run_id = r.id) as room_count,
          r.status, r.start_time
        FROM runs r
        JOIN dungeons d ON r.dungeon_id = d.id
        WHERE r.id IN (${placeholders})`
      )
      .all(...runIds)

    return { runs }
  }
}
