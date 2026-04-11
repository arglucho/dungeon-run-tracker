import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, LoadingSpinner, ErrorMessage } from '../components'

interface RunData {
  id: number
  dungeon_name: string
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  is_group: number
  rooms: { resources: { resource_name: string; quantity: number }[] }[]
}

export function RunFinished(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [run, setRun] = useState<RunData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <LoadingSpinner message="Cargando resumen..." />
  if (error) return <ErrorMessage message={error} />
  if (!run) return <ErrorMessage message="Run no encontrada" />

  const formatTime = (s: number): string => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}m ${sec}s`
  }

  const xpPerMin = run.total_time_seconds > 0 ? (run.total_xp / run.total_time_seconds) * 60 : 0
  const kamasPerMin = run.total_time_seconds > 0 ? (run.total_kamas / run.total_time_seconds) * 60 : 0

  // Agrupar recursos de todas las salas
  const resourceTotals = new Map<string, number>()
  for (const room of run.rooms) {
    for (const res of room.resources) {
      const current = resourceTotals.get(res.resource_name) || 0
      resourceTotals.set(res.resource_name, current + res.quantity)
    }
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold text-secondary mb-2">🎉 ¡Run Finalizada!</h1>
      <p className="text-text-muted mb-6">{run.dungeon_name}</p>

      <Card gold className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-secondary">{run.total_xp.toLocaleString()}</p>
            <p className="text-xs text-text-muted">XP Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">{run.total_kamas.toLocaleString()}</p>
            <p className="text-xs text-text-muted">Kamas Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text">{formatTime(run.total_time_seconds)}</p>
            <p className="text-xs text-text-muted">Tiempo Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text">{run.rooms.length}</p>
            <p className="text-xs text-text-muted">Salas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-light">{Math.round(xpPerMin).toLocaleString()}</p>
            <p className="text-xs text-text-muted">XP/min</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-light">{Math.round(kamasPerMin).toLocaleString()}</p>
            <p className="text-xs text-text-muted">Kamas/min</p>
          </div>
        </div>
      </Card>

      {resourceTotals.size > 0 && (
        <Card className="mb-6 text-left">
          <h3 className="text-sm font-bold text-text-muted mb-2">💎 Recursos obtenidos</h3>
          {Array.from(resourceTotals.entries()).map(([name, qty]) => (
            <div key={name} className="flex justify-between py-1 text-sm">
              <span className="text-text">{name}</span>
              <span className="text-secondary font-bold">×{qty}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Button onClick={() => navigate(`/run/${id}`)}>📋 Ver Detalle</Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          🏠 Dashboard
        </Button>
      </div>
    </div>
  )
}
