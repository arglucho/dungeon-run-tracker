import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ConfirmModal, LoadingSpinner, ErrorMessage } from '../components'

interface RoomResource {
  resource_name: string
  quantity: number
}

interface Room {
  id: number
  room_number: number
  turns: number | null
  time_seconds: number
  xp: number
  kamas: number
  notes: string | null
  resources: RoomResource[]
}

interface RunData {
  id: number
  dungeon_name: string
  expected_rooms: number
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  is_group: number
  status: string
  start_time: string
  end_time: string | null
  notes: string | null
  rooms: Room[]
}

const statusLabels: Record<string, string> = {
  COMPLETED: '✅ Completada',
  IN_PROGRESS: '⏳ En progreso',
  ABANDONED: '🏳️ Abandonada'
}

export function RunDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [run, setRun] = useState<RunData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchRun = async (): Promise<void> => {
      try {
        const result = await window.api.runGetById(parseInt(id!))
        if (result.success) {
          setRun(result.data as RunData)
        } else {
          setError(result.error ?? 'Error al cargar la run')
        }
      } catch {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    fetchRun()
  }, [id])

  const handleDelete = async (): Promise<void> => {
    setDeleting(true)
    try {
      const result = await window.api.runDelete(parseInt(id!))
      if (result.success) {
        navigate('/history')
      } else {
        setError(result.error ?? 'Error al eliminar la run')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  const handleExportJSON = async (): Promise<void> => {
    try {
      const result = await window.api.exportRunJSON(parseInt(id!))
      if (result.success && result.data) {
        const pathResult = await window.api.dialogSaveFile(
          `run_${id}_${new Date().toISOString().split('T')[0]}.json`,
          [{ name: 'JSON', extensions: ['json'] }]
        )
        // El JSON se escribe desde el renderer si tenemos la ruta
        // Nota: la escritura real se hace del lado del main process
      }
    } catch {
      setError('Error al exportar')
    }
  }

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

  if (loading) return <LoadingSpinner message="Cargando run..." />
  if (error) return <ErrorMessage message={error} />
  if (!run) return <ErrorMessage message="Run no encontrada" />

  const xpPerMin = run.total_time_seconds > 0 ? (run.total_xp / run.total_time_seconds) * 60 : 0
  const kamasPerMin = run.total_time_seconds > 0 ? (run.total_kamas / run.total_time_seconds) * 60 : 0

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">
            📋 Run #{run.id} — {run.dungeon_name}
          </h1>
          <p className="text-sm text-text-muted">
            {formatDate(run.start_time)} • {run.is_group ? '👥 Grupo' : '🧍 Solo'} • {statusLabels[run.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/run/${id}/edit`)}>
            ✏️ Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportJSON}>
            📤 JSON
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            🗑️ Eliminar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <Card gold className="mb-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-secondary">{run.total_xp.toLocaleString()}</p>
            <p className="text-xs text-text-muted">XP Total</p>
          </div>
          <div>
            <p className="text-xl font-bold text-secondary">{run.total_kamas.toLocaleString()}</p>
            <p className="text-xs text-text-muted">Kamas</p>
          </div>
          <div>
            <p className="text-xl font-bold text-text">{formatTime(run.total_time_seconds)}</p>
            <p className="text-xs text-text-muted">Tiempo</p>
          </div>
          <div>
            <p className="text-xl font-bold text-text">{run.rooms.length}/{run.expected_rooms}</p>
            <p className="text-xs text-text-muted">Salas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-light">{Math.round(xpPerMin).toLocaleString()}</p>
            <p className="text-xs text-text-muted">XP/min</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-light">{Math.round(kamasPerMin).toLocaleString()}</p>
            <p className="text-xs text-text-muted">K/min</p>
          </div>
        </div>
      </Card>

      {run.notes && (
        <Card className="mb-4">
          <p className="text-sm text-text-muted">{run.notes}</p>
        </Card>
      )}

      {/* Salas */}
      <h2 className="text-lg font-bold text-secondary mb-3">📍 Salas</h2>
      <div className="flex flex-col gap-2">
        {run.rooms.map((room) => (
          <Card key={room.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-text">Sala {room.room_number}</p>
                <div className="flex gap-4 text-sm text-text-muted mt-1">
                  <span>XP: {room.xp.toLocaleString()}</span>
                  <span>K: {room.kamas.toLocaleString()}</span>
                  <span>⏱ {formatTime(room.time_seconds)}</span>
                  {room.turns != null && <span>🎯 {room.turns} turnos</span>}
                </div>
                {room.resources.length > 0 && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {room.resources.map((r, i) => (
                      <span key={i} className="text-xs bg-bg-lighter px-2 py-0.5 rounded text-text-muted">
                        {r.resource_name} ×{r.quantity}
                      </span>
                    ))}
                  </div>
                )}
                {room.notes && <p className="text-xs text-text-dark mt-1">{room.notes}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/history')}>
          ← Volver al Historial
        </Button>
      </div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar Run"
        message="¿Estás seguro? Se eliminarán todas las salas y recursos asociados. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        loading={deleting}
      />
    </div>
  )
}
