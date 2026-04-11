import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDungeons } from '../hooks'
import { Button, Card, Select, Input, LoadingSpinner, ErrorMessage, EmptyState } from '../components'

interface RunRow {
  id: number
  dungeon_name: string
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  status: string
  start_time: string
  is_group: number
  expected_rooms: number
}

const statusLabels: Record<string, string> = {
  COMPLETED: '✅ Completada',
  IN_PROGRESS: '⏳ En progreso',
  ABANDONED: '🏳️ Abandonada'
}

export function RunHistory(): React.JSX.Element {
  const navigate = useNavigate()
  const { dungeons } = useDungeons()
  const [runs, setRuns] = useState<RunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filterDungeon, setFilterDungeon] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const loadRuns = async (): Promise<void> => {
    setLoading(true)
    try {
      const filters: Record<string, unknown> = {}
      if (filterDungeon) filters.dungeon_id = parseInt(filterDungeon)
      if (filterStatus) filters.status = filterStatus
      if (filterMode) filters.is_group = filterMode === 'group'
      if (filterDateFrom) filters.date_from = filterDateFrom
      if (filterDateTo) filters.date_to = filterDateTo

      const result = await window.api.runGetAll(Object.keys(filters).length > 0 ? filters : undefined)
      if (result.success) {
        setRuns(result.data as RunRow[])
      } else {
        setError(result.error ?? 'Error al cargar runs')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRuns()
  }, [filterDungeon, filterStatus, filterMode, filterDateFrom, filterDateTo])

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  const formatDate = (d: string): string => {
    try {
      return new Date(d).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch { return d }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-4">📜 Historial de Runs</h1>

      {error && <ErrorMessage message={error} />}

      {/* Filtros */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Select
            placeholder="Todas las mazmorras"
            options={dungeons.map((d) => ({ value: d.id, label: d.name }))}
            value={filterDungeon}
            onChange={(e) => setFilterDungeon(e.target.value)}
          />
          <Select
            placeholder="Todos los estados"
            options={[
              { value: 'COMPLETED', label: 'Completada' },
              { value: 'ABANDONED', label: 'Abandonada' },
              { value: 'IN_PROGRESS', label: 'En progreso' }
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
          <Select
            placeholder="Todos los modos"
            options={[
              { value: 'solo', label: 'Solo' },
              { value: 'group', label: 'Grupo' }
            ]}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          />
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner message="Cargando historial..." />
      ) : runs.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No hay runs registradas"
          description="Empezá una nueva run desde el Dashboard."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((run) => (
            <Card key={run.id} className="cursor-pointer hover:border-border-gold transition-colors" onClick={() => navigate(`/run/${run.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold text-text">
                      #{run.id} — {run.dungeon_name}
                    </p>
                    <p className="text-xs text-text-dark">
                      {formatDate(run.start_time)} • {run.is_group ? '👥 Grupo' : '🧍 Solo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-secondary font-bold">{run.total_xp.toLocaleString()} XP</p>
                    <p className="text-text-muted">{run.total_kamas.toLocaleString()} K</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text">{formatTime(run.total_time_seconds)}</p>
                    <p className="text-xs text-text-dark">{statusLabels[run.status] ?? run.status}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/run/${run.id}`) }}>
                    →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-xs text-text-dark mt-2">{runs.length} run{runs.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}
