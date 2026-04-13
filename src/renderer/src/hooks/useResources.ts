import { useState, useEffect, useCallback } from 'react'

interface Resource {
  id: number
  name: string
  image_filename: string | null
  pods: number | null
  level: number | null
  description: string | null
  created_at: string
  is_active: number
}

interface ResourceInput {
  name: string
  image_filename?: string | null
  pods?: number | null
  level?: number | null
  description?: string | null
}

interface UseResourcesReturn {
  resources: Resource[]
  loading: boolean
  error: string | null
  refresh: () => void
  create: (input: ResourceInput) => Promise<boolean>
  update: (id: number, input: ResourceInput) => Promise<boolean>
  remove: (id: number) => Promise<boolean>
  search: (query: string) => Promise<Resource[]>
}

export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.resourceGetAll()
      if (result.success) {
        setResources(result.data ?? [])
      } else {
        setError(result.error ?? 'Error al cargar recursos')
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
    async (input: ResourceInput): Promise<boolean> => {
      try {
        const result = await window.api.resourceCreate(input)
        if (result.success) {
          await refresh()
          return true
        }
        setError(result.error ?? 'Error al crear recurso')
        return false
      } catch {
        setError('Error de conexión')
        return false
      }
    },
    [refresh]
  )

  const update = useCallback(
    async (id: number, input: ResourceInput): Promise<boolean> => {
      try {
        const result = await window.api.resourceUpdate(id, input)
        if (result.success) {
          await refresh()
          return true
        }
        setError(result.error ?? 'Error al actualizar recurso')
        return false
      } catch {
        setError('Error de conexión')
        return false
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const result = await window.api.resourceDelete(id)
        if (result.success) {
          await refresh()
          return true
        }
        setError(result.error ?? 'Error al eliminar recurso')
        return false
      } catch {
        setError('Error de conexión')
        return false
      }
    },
    [refresh]
  )

  const search = useCallback(async (query: string): Promise<Resource[]> => {
    try {
      const result = await window.api.resourceSearch(query)
      return result.success ? (result.data ?? []) : []
    } catch {
      return []
    }
  }, [])

  return { resources, loading, error, refresh, create, update, remove, search }
}
