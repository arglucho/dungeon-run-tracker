export interface Room {
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

export interface RoomResource {
  id: number
  room_id: number
  resource_id: number
  resource_name: string
  quantity: number
}

export interface RoomWithResources extends Room {
  resources: RoomResource[]
}

export interface CreateRoomInput {
  run_id: number
  turns?: number
  time_seconds: number
  xp: number
  kamas: number
  notes?: string
  resources: { resource_id: number; quantity: number }[]
}

export interface UpdateRoomInput {
  turns?: number
  time_seconds?: number
  xp?: number
  kamas?: number
  notes?: string
  resources?: { resource_id: number; quantity: number }[]
}
