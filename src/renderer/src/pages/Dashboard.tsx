import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveRun } from '../context'
import { Button, Card, LoadingSpinner, ErrorMessage } from '../components'

interface GlobalStats {
  total_runs: number
  total_xp: number
  total_kamas: number
  total_time_seconds: number
}

interface LastRun {
  id: number
  dungeon_name: string
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  status: string
  start_time: string
  rooms: unknown[]
}

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const { activeRun, loading: runLoading } = useActiveRun()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [lastRun, setLastRun] = useState<LastRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const [statsResult, runsResult] = await Promise.all([
          window.api.statsGlobal(),
          window.api.runGetAll({ status: 'COMPLETED' })
        ])

        if (statsResult.success) setStats(statsResult.data as GlobalStats)
        if (runsResult.success) {
          const runs = runsResult.data as LastRun[]
          if (runs.length > 0) setLastRun(runs[0])
        }
      } catch {
        setError('Error al cargar datos del dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatTime = (s: number): string => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (loading || runLoading) return <LoadingSpinner message="Cargando dashboard..." />

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-6">🏠 Dashboard</h1>

      {error && <ErrorMessage message={error} />}

      {/* Run activa */}
      {activeRun && (
        <Card gold className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-secondary">⚔️ Run en progreso</h3>
              <p className="text-sm text-text-muted">
                {activeRun.dungeon_name} — Sala {(activeRun.rooms?.length ?? 0) + 1}/{activeRun.expected_rooms}
              </p>
            </div>
            <Button onClick={() => navigate(`/run/${activeRun.id}/room`)}>
              ▶ Continuar Run
            </Button>
          </div>
        </Card>
      )}

      {/* Botón principal */}
      <div className="flex gap-3 mb-6">
        {!activeRun && (
          <Button variant="secondary" onClick={() => navigate('/new-run')}>
            🚀 Nueva Run
          </Button>
        )}
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-2xl font-bold text-secondary">{stats?.total_runs ?? 0}</p>
          <p className="text-xs text-text-muted">Runs Completadas</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-secondary">
            {(stats?.total_xp ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-text-muted">XP Total</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-secondary">
            {(stats?.total_kamas ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-text-muted">Kamas Total</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-secondary">
            {formatTime(stats?.total_time_seconds ?? 0)}
          </p>
          <p className="text-xs text-text-muted">Tiempo Total</p>
        </Card>
      </div>

      {/* Última run */}
      {lastRun && (
        <Card title="📜 Última Run Completada" className="mb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-text-muted">
              <p>{lastRun.dungeon_name}</p>
              <p>XP: {lastRun.total_xp.toLocaleString()} | Kamas: {lastRun.total_kamas.toLocaleString()} | {formatTime(lastRun.total_time_seconds)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/run/${lastRun.id}`)}>
              Ver →
            </Button>
          </div>
        </Card>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { to: '/history', icon: '📜', label: 'Historial' },
          { to: '/statistics', icon: '📊', label: 'Estadísticas' },
          { to: '/compare', icon: '⚖️', label: 'Comparador' },
          { to: '/resources', icon: '💎', label: 'Recursos' },
          { to: '/dungeons', icon: '🏰', label: 'Mazmorras' }
        ].map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex flex-col items-center gap-2 p-4 bg-bg-card border border-border rounded-lg hover:border-border-gold transition-colors cursor-pointer"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm text-text-muted">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
