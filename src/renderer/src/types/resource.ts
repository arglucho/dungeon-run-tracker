export interface Resource {
  id: number
  name: string
  created_at: string
  is_active: number // 0 = inactivo (soft deleted), 1 = activo
}

export interface CreateResourceInput {
  name: string
}

export interface UpdateResourceInput {
  name: string
}
