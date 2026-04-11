import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveRun } from '../context'
import { useDungeons } from '../hooks'
import { Button, Card, Select, TextArea, ErrorMessage, LoadingSpinner } from '../components'

export function NewRun(): React.JSX.Element {
  const navigate = useNavigate()
  const { activeRun, loading: runLoading, refresh } = useActiveRun()
  const { dungeons, loading: dungeonsLoading } = useDungeons()

  const [dungeonId, setDungeonId] = useState('')
  const [isGroup, setIsGroup] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Si hay run activa, redirigir
  useEffect(() => {
    if (!runLoading && activeRun) {
      navigate(`/run/${activeRun.id}/room`)
    }
  }, [activeRun, runLoading, navigate])

  const handleCreate = async (): Promise<void> => {
    if (!dungeonId) {
      setError('Seleccioná una mazmorra')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await window.api.runCreate({
        dungeon_id: parseInt(dungeonId),
        is_group: isGroup,
        notes: notes.trim() || undefined
      })

      if (result.success && result.data) {
        await refresh()
        navigate(`/run/${result.data.id}/room`)
      } else {
        setError(result.error ?? 'Error al crear la run')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (runLoading || dungeonsLoading) return <LoadingSpinner message="Cargando..." />

  const dungeonOptions = dungeons.map((d) => ({
    value: d.id,
    label: `${d.name} (${d.expected_rooms} salas)`
  }))

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-secondary mb-6">⚔️ Nueva Run</h1>

      <Card gold>
        <div className="flex flex-col gap-5">
          {error && <ErrorMessage message={error} />}

          <Select
            label="Mazmorra"
            placeholder="Seleccionar mazmorra..."
            options={dungeonOptions}
            value={dungeonId}
            onChange={(e) => setDungeonId(e.target.value)}
          />

          {/* Modo Solo/Grupo */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-muted">Modo</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={!isGroup}
                  onChange={() => setIsGroup(false)}
                  className="accent-secondary"
                />
                <span className="text-text">🧍 Solo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={isGroup}
                  onChange={() => setIsGroup(true)}
                  className="accent-secondary"
                />
                <span className="text-text">👥 Grupo</span>
              </label>
            </div>
          </div>

          <TextArea
            label="Notas (opcional)"
            placeholder="Notas generales sobre esta run..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => navigate('/')}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              🚀 Iniciar Run
            </Button>
          </div>
        </div>
      </Card>

      {dungeons.length === 0 && (
        <div className="mt-4 text-center">
          <p className="text-text-muted text-sm mb-2">
            No hay mazmorras registradas. Creá una primero.
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/dungeons')}>
            Ir a Mazmorras
          </Button>
        </div>
      )}
    </div>
  )
}
