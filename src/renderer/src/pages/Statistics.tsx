import { useState, useEffect } from 'react'
import { useDungeons } from '../hooks'
import { Card, Select, LoadingSpinner, ErrorMessage, EmptyState } from '../components'

interface GlobalStats {
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

interface RoomStat {
  room_number: number
  avg_time: number
  avg_xp: number
  avg_kamas: number
  avg_turns: number | null
  min_time: number
  max_time: number
}

interface ResourceStat {
  resource_name: string
  total_quantity: number
  avg_per_run: number
  appearance_percentage: number
}

type Tab = 'global' | 'rooms' | 'resources'

export function Statistics(): React.JSX.Element {
  const { dungeons } = useDungeons()
  const [tab, setTab] = useState<Tab>('global')
  const [filterMode, setFilterMode] = useState('')
  const [filterDungeon, setFilterDungeon] = useState('')

  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [roomStats, setRoomStats] = useState<RoomStat[]>([])
  const [resourceStats, setResourceStats] = useState<ResourceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async (): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        const filters: Record<string, unknown> = {}
        if (filterMode) filters.is_group = filterMode === 'group'

        if (tab === 'global') {
          if (filterDungeon) filters.dungeon_id = parseInt(filterDungeon)
          const result = await window.api.statsGlobal(Object.keys(filters).length > 0 ? filters : undefined)
          if (result.success) setGlobalStats(result.data as GlobalStats)
        } else if (tab === 'rooms' && filterDungeon) {
          const result = await window.api.statsByRoom(parseInt(filterDungeon), Object.keys(filters).length > 0 ? filters : undefined)
          if (result.success) setRoomStats(result.data as RoomStat[])
        } else if (tab === 'resources') {
          const result = await window.api.statsByResource(Object.keys(filters).length > 0 ? filters : undefined)
          if (result.success) setResourceStats(result.data as ResourceStat[])
        }
      } catch {
        setError('Error al cargar estadísticas')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [tab, filterMode, filterDungeon])

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}m ${sec}s`
  }

  const formatHours = (s: number): string => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'global', label: '🌍 Global' },
    { id: 'rooms', label: '📍 Por Sala' },
    { id: 'resources', label: '💎 Por Recurso' }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-4">📊 Estadísticas</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-primary text-text border border-border-gold'
                : 'bg-bg-card text-text-muted border border-border hover:border-border-light'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex gap-3">
          <Select
            placeholder="Todos los modos"
            options={[
              { value: 'solo', label: 'Solo' },
              { value: 'group', label: 'Grupo' }
            ]}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          />
          {(tab === 'global' || tab === 'rooms') && (
            <Select
              placeholder="Todas las mazmorras"
              options={dungeons.map((d) => ({ value: d.id, label: d.name }))}
              value={filterDungeon}
              onChange={(e) => setFilterDungeon(e.target.value)}
            />
          )}
        </div>
      </Card>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner message="Calculando estadísticas..." />
      ) : (
        <>
          {/* Global Stats */}
          {tab === 'global' && globalStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><p className="text-xl font-bold text-secondary">{globalStats.total_runs}</p><p className="text-xs text-text-muted">Runs Completadas</p></Card>
              <Card><p className="text-xl font-bold text-secondary">{globalStats.total_xp.toLocaleString()}</p><p className="text-xs text-text-muted">XP Total</p></Card>
              <Card><p className="text-xl font-bold text-secondary">{globalStats.total_kamas.toLocaleString()}</p><p className="text-xs text-text-muted">Kamas Total</p></Card>
              <Card><p className="text-xl font-bold text-secondary">{formatHours(globalStats.total_time_seconds)}</p><p className="text-xs text-text-muted">Tiempo Total</p></Card>
              <Card><p className="text-xl font-bold text-text">{Math.round(globalStats.avg_xp_per_run).toLocaleString()}</p><p className="text-xs text-text-muted">XP Promedio/Run</p></Card>
              <Card><p className="text-xl font-bold text-text">{Math.round(globalStats.avg_kamas_per_run).toLocaleString()}</p><p className="text-xs text-text-muted">Kamas Promedio/Run</p></Card>
              <Card><p className="text-xl font-bold text-text">{formatTime(globalStats.avg_time_per_run)}</p><p className="text-xs text-text-muted">Tiempo Promedio</p></Card>
              <Card><p className="text-xl font-bold text-accent-light">{Math.round(globalStats.avg_xp_per_minute).toLocaleString()}</p><p className="text-xs text-text-muted">XP/min Promedio</p></Card>
              {globalStats.best_run_id && (
                <Card gold><p className="text-xl font-bold text-secondary">#{globalStats.best_run_id}</p><p className="text-xs text-text-muted">Mejor Run ({Math.round(globalStats.best_run_xp_per_min)} XP/min)</p></Card>
              )}
              {globalStats.fastest_run_id && (
                <Card gold><p className="text-xl font-bold text-secondary">#{globalStats.fastest_run_id}</p><p className="text-xs text-text-muted">Más Rápida ({formatTime(globalStats.fastest_run_time)})</p></Card>
              )}
            </div>
          )}

          {/* Room Stats */}
          {tab === 'rooms' && (
            !filterDungeon ? (
              <EmptyState icon="📍" title="Seleccioná una mazmorra" description="Elegí una mazmorra en el filtro para ver estadísticas por sala." />
            ) : roomStats.length === 0 ? (
              <EmptyState icon="📍" title="Sin datos" description="No hay runs completadas para esta mazmorra." />
            ) : (
              <div className="flex flex-col gap-2">
                {roomStats.map((rs) => (
                  <Card key={rs.room_number}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-text">Sala {rs.room_number}</p>
                      <div className="flex gap-4 text-sm text-text-muted">
                        <span>⏱ {formatTime(rs.avg_time)}</span>
                        <span>XP: {Math.round(rs.avg_xp).toLocaleString()}</span>
                        <span>K: {Math.round(rs.avg_kamas).toLocaleString()}</span>
                        {rs.avg_turns != null && <span>🎯 {Math.round(rs.avg_turns)} turnos</span>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Resource Stats */}
          {tab === 'resources' && (
            resourceStats.length === 0 ? (
              <EmptyState icon="💎" title="Sin datos" description="No hay datos de recursos aún." />
            ) : (
              <div className="flex flex-col gap-2">
                {resourceStats.map((rs) => (
                  <Card key={rs.resource_name}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-text">{rs.resource_name}</p>
                      <div className="flex gap-4 text-sm text-text-muted">
                        <span>Total: {rs.total_quantity}</span>
                        <span>Promedio/Run: {rs.avg_per_run.toFixed(1)}</span>
                        <span>Aparición: {rs.appearance_percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
