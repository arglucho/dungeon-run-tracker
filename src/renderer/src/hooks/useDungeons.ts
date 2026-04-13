import { useState, useEffect, useCallback } from 'react'

interface Dungeon {
  id: number
  name: string
  expected_rooms: number
  description: string | null
  created_at: string
}

interface UseDungeonsReturn {
  dungeons: Dungeon[]
  loading: boolean
  error: string | null
  refresh: () => void
  create: (name: string, expectedRooms: number, description?: string) => Promise<boolean>
  update: (id: number, name: string, expectedRooms: number, description?: string) => Promise<boolean>
}

export function useDungeons(): UseDungeonsReturn {
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.dungeonGetAll()
      if (result.success) {
        setDungeons(result.data ?? [])
      } else {
        setError(result.error ?? 'Error al cargar mazmorras')
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (name: string, expectedRooms: number, description?: string): Promise<boolean> => {
      try {
        const result = await window.api.dungeonCreate({ name, expected_rooms: expectedRooms, description })
        if (result.success) {
          await refresh()
          return true
        }
        setError(result.error ?? 'Error al crear mazmorra')
        return false
      } catch {
        setError('Error de conexión')
        return false
      }
    },
    [refresh]
  )

  const update = useCallback(
    async (id: number, name: string, expectedRooms: number, description?: string): Promise<boolean> => {
      try {
        const result = await window.api.dungeonUpdate(id, { name, expected_rooms: expectedRooms, description })
        if (result.success) {
          await refresh()
          return true
        }
        setError(result.error ?? 'Error al actualizar mazmorra')
        return false
      } catch {
        setError('Error de conexión')
        return false
      }
    },
    [refresh]
  )

  return { dungeons, loading, error, refresh, create, update }
}
