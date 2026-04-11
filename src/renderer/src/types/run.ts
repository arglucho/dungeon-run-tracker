export type RunStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

export interface Run {
  id: number
  dungeon_id: number
  start_time: string
  end_time: string | null
  total_time_seconds: number
  total_xp: number
  total_kamas: number
  is_group: number // 0 = solo, 1 = grupo
  notes: string | null
  status: RunStatus
  created_at: string
}

export interface RunWithDetails extends Run {
  dungeon_name: string
  expected_rooms: number
  rooms: RoomWithResources[]
}

export interface CreateRunInput {
  dungeon_id: number
  is_group: boolean
  notes?: string
}

export interface UpdateRunInput {
  is_group?: boolean
  notes?: string
}

export interface RunFilters {
  dungeon_id?: number
  status?: RunStatus
  is_group?: boolean
  date_from?: string
  date_to?: string
}

// Se importa desde room.ts
import type { RoomWithResources } from './room'
