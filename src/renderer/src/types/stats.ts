export interface GlobalStats {
  total_runs: number
  total_completed: number
  total_abandoned: number
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  avg_xp_per_run: number
  avg_kamas_per_run: number
  avg_time_per_run: number
  avg_xp_per_minute: number
  avg_kamas_per_minute: number
  best_run_id: number | null
  best_run_xp_per_min: number
  worst_run_id: number | null
  worst_run_xp_per_min: number
  fastest_run_id: number | null
  fastest_run_time: number
  slowest_run_id: number | null
  slowest_run_time: number
}

export interface RoomStats {
  room_number: number
  avg_time: number
  avg_xp: number
  avg_kamas: number
  avg_turns: number | null
  min_time: number
  max_time: number
}

export interface ResourceStats {
  resource_id: number
  resource_name: string
  total_quantity: number
  avg_per_run: number
  appearance_count: number
  appearance_percentage: number
}

export interface TemporalStats {
  date: string
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  run_count: number
  avg_xp_per_minute: number
}

export interface StatsFilters {
  dungeon_id?: number
  is_group?: boolean
  date_from?: string
  date_to?: string
}

export interface RunComparison {
  runs: {
    id: number
    dungeon_name: string
    total_xp: number
    total_kamas: number
    total_time_seconds: number
    xp_per_minute: number
    kamas_per_minute: number
    room_count: number
    status: string
    start_time: string
  }[]
}
