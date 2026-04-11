import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useActiveRun } from '../context'
import { Button, Card, Input, TextArea, Timer, ResourceSelector, ConfirmModal, LoadingSpinner, ErrorMessage } from '../components'

interface RoomResource {
  resource_id: number
  resource_name: string
  quantity: number
}

export function RoomRegistration(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeRun, loading, refresh } = useActiveRun()

  const [timeSeconds, setTimeSeconds] = useState(0)
  const [turns, setTurns] = useState('')
  const [xp, setXp] = useState('')
  const [kamas, setKamas] = useState('')
  const [notes, setNotes] = useState('')
  const [resources, setResources] = useState<RoomResource[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)

  useEffect(() => {
    if (!loading && !activeRun) {
      navigate('/')
    }
  }, [loading, activeRun, navigate])

  if (loading) return <LoadingSpinner message="Cargando run activa..." />
  if (!activeRun) return <LoadingSpinner message="Redirigiendo..." />

  const currentRoom = (activeRun.rooms?.length ?? 0) + 1
  const totalRooms = activeRun.expected_rooms

  const handleAddResource = (resourceId: number, resourceName: string, quantity: number): void => {
    setResources((prev) => {
      const existing = prev.find((r) => r.resource_id === resourceId)
      if (existing) {
        return prev.map((r) =>
          r.resource_id === resourceId ? { ...r, quantity: r.quantity + quantity } : r
        )
      }
      return [...prev, { resource_id: resourceId, resource_name: resourceName, quantity }]
    })
  }

  const handleRemoveResource = (resourceId: number): void => {
    setResources((prev) => prev.filter((r) => r.resource_id !== resourceId))
  }

  const handleSave = async (): Promise<void> => {
    const xpVal = parseInt(xp)
    const kamasVal = parseInt(kamas)

    if (isNaN(xpVal) || xpVal < 0) {
      setError('La XP debe ser un número válido ≥ 0')
      return
    }
    if (isNaN(kamasVal) || kamasVal < 0) {
      setError('Las kamas deben ser un número válido ≥ 0')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await window.api.roomAdd({
        run_id: activeRun.id,
        time_seconds: timeSeconds,
        turns: turns ? parseInt(turns) : undefined,
        xp: xpVal,
        kamas: kamasVal,
        notes: notes.trim() || undefined,
        resources: resources.map((r) => ({ resource_id: r.resource_id, quantity: r.quantity }))
      })

      if (result.success && result.data) {
        await refresh()
        if (result.data.run_finished) {
          navigate(`/run/${id}/finished`)
        } else {
          // Limpiar formulario
          setTimeSeconds(0)
          setTurns('')
          setXp('')
          setKamas('')
          setNotes('')
          setResources([])
        }
      } else {
        setError(result.error ?? 'Error al guardar la sala')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleAbandon = async (): Promise<void> => {
    setSaving(true)
    try {
      const result = await window.api.runAbandon(activeRun.id)
      if (result.success) {
        await refresh()
        navigate('/')
      } else {
        setError(result.error ?? 'Error al abandonar la run')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
      setShowAbandon(false)
    }
  }

  const handleDeleteLastRoom = async (): Promise<void> => {
    if (!activeRun.rooms || activeRun.rooms.length === 0) return
    setSaving(true)
    try {
      const result = await window.api.roomDeleteLast(activeRun.id)
      if (result.success) {
        await refresh()
      } else {
        setError(result.error ?? 'Error al eliminar la sala')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">
            ⚔️ Run #{activeRun.id} — {activeRun.dungeon_name}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {activeRun.is_group ? '👥 Grupo' : '🧍 Solo'} • Sala{' '}
            <span className="text-secondary font-bold">{currentRoom}</span> / {totalRooms}
          </p>
        </div>
        <div className="flex gap-2">
          {activeRun.rooms && activeRun.rooms.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleDeleteLastRoom} disabled={saving}>
              ↩ Deshacer última sala
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setShowAbandon(true)}>
            🏳️ Abandonar Run
          </Button>
        </div>
      </div>

      {/* Progreso */}
      <div className="w-full bg-bg-lighter rounded-full h-2 mb-6">
        <div
          className="bg-secondary h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentRoom - 1) / totalRooms) * 100}%` }}
        />
      </div>

      {error && <ErrorMessage message={error} />}

      <Card gold className="mt-4">
        <h2 className="text-lg font-bold text-secondary mb-4">
          📝 Sala {currentRoom}
        </h2>
        <div className="flex flex-col gap-4">
          {/* Timer */}
          <Timer onTimeSet={setTimeSeconds} disabled={saving} />

          {/* Turnos */}
          <Input
            label="Turnos (opcional)"
            type="number"
            min={0}
            max={999}
            placeholder="Ej: 15"
            value={turns}
            onChange={(e) => setTurns(e.target.value)}
          />

          {/* XP y Kamas */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="XP ganada"
              type="number"
              min={0}
              placeholder="0"
              value={xp}
              onChange={(e) => setXp(e.target.value)}
            />
            <Input
              label="Kamas ganadas"
              type="number"
              min={0}
              placeholder="0"
              value={kamas}
              onChange={(e) => setKamas(e.target.value)}
            />
          </div>

          {/* Recursos */}
          <ResourceSelector onAdd={handleAddResource} disabled={saving} />

          {resources.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Recursos agregados:</span>
              {resources.map((r) => (
                <div key={r.resource_id} className="flex items-center justify-between px-3 py-1.5 bg-bg-lighter rounded">
                  <span className="text-sm text-text">
                    {r.resource_name} × {r.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveResource(r.resource_id)}
                    className="text-danger-light text-xs hover:text-danger cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notas */}
          <TextArea
            label="Notas (opcional)"
            placeholder="Observaciones de esta sala..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />

          {/* Guardar */}
          <Button onClick={handleSave} loading={saving} className="w-full">
            💾 Guardar Sala {currentRoom}
          </Button>
        </div>
      </Card>

      {/* Modal abandonar */}
      <ConfirmModal
        open={showAbandon}
        onClose={() => setShowAbandon(false)}
        onConfirm={handleAbandon}
        title="Abandonar Run"
        message="¿Estás seguro? La run quedará marcada como ABANDONADA con los datos parciales registrados hasta ahora."
        confirmLabel="Sí, abandonar"
        loading={saving}
      />
    </div>
  )
}
