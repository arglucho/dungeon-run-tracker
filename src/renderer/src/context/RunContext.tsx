import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface ActiveRun {
  id: number
  dungeon_id: number
  dungeon_name: string
  expected_rooms: number
  start_time: string
  is_group: number
  notes: string | null
  status: string
  rooms: unknown[]
}

interface RunContextValue {
  activeRun: ActiveRun | null
  loading: boolean
  refresh: () => Promise<void>
}

const RunContext = createContext<RunContextValue>({
  activeRun: null,
  loading: true,
  refresh: async () => {}
})

export function RunProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await window.api.runGetActive()
      setActiveRun(result.success ? (result.data as ActiveRun) ?? null : null)
    } catch {
      setActiveRun(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <RunContext.Provider value={{ activeRun, loading, refresh }}>
      {children}
    </RunContext.Provider>
  )
}

export function useActiveRun(): RunContextValue {
  return useContext(RunContext)
}
