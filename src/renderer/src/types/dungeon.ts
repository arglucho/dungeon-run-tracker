export interface Dungeon {
  id: number
  name: string
  expected_rooms: number
  description: string | null
  created_at: string
}

export interface CreateDungeonInput {
  name: string
  expected_rooms: number
  description?: string
}

export interface UpdateDungeonInput {
  name?: string
  expected_rooms?: number
  description?: string
}
