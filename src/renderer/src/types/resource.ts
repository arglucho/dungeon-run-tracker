export interface Resource {
  id: number
  name: string
  image_filename: string | null
  pods: number | null
  level: number | null
  description: string | null
  created_at: string
  is_active: number // 0 = inactivo (soft deleted), 1 = activo
}

export interface CreateResourceInput {
  name: string
  image_filename?: string | null
  pods?: number | null
  level?: number | null
  description?: string | null
}

export interface UpdateResourceInput {
  name: string
  image_filename?: string | null
  pods?: number | null
  level?: number | null
  description?: string | null
}
