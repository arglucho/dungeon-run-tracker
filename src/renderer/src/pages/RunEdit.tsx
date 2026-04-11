import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, TextArea, LoadingSpinner, ErrorMessage } from '../components'

export function RunEdit(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isGroup, setIsGroup] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRun = async (): Promise<void> => {
      try {
        const result = await window.api.runGetById(parseInt(id!))
        if (result.success && result.data) {
          const run = result.data as { is_group: number; notes: string | null }
          setIsGroup(!!run.is_group)
          setNotes(run.notes || '')
        } else {
          setError('Run no encontrada')
        }
      } catch {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    fetchRun()
  }, [id])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      const result = await window.api.runUpdate(parseInt(id!), {
        is_group: isGroup,
        notes: notes.trim() || undefined
      })
      if (result.success) {
        navigate(`/run/${id}`)
      } else {
        setError(result.error ?? 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando..." />

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-secondary mb-6">✏️ Editar Run #{id}</h1>

      {error && <ErrorMessage message={error} />}

      <Card gold>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-muted">Modo</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isGroup} onChange={() => setIsGroup(false)} className="accent-secondary" />
                <span className="text-text">🧍 Solo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isGroup} onChange={() => setIsGroup(true)} className="accent-secondary" />
                <span className="text-text">👥 Grupo</span>
              </label>
            </div>
          </div>

          <TextArea
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
          />

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => navigate(`/run/${id}`)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
