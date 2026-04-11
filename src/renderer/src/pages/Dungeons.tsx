import { useState } from 'react'
import { useDungeons } from '../hooks'
import { Button, Card, Input, TextArea, Modal, LoadingSpinner, ErrorMessage, EmptyState } from '../components'

interface DungeonForm {
  name: string
  expected_rooms: string
  description: string
}

const emptyForm: DungeonForm = { name: '', expected_rooms: '', description: '' }

export function Dungeons(): React.JSX.Element {
  const { dungeons, loading, error, create, update } = useDungeons()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<DungeonForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = (): void => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (dungeon: { id: number; name: string; expected_rooms: number; description: string | null }): void => {
    setEditingId(dungeon.id)
    setForm({
      name: dungeon.name,
      expected_rooms: String(dungeon.expected_rooms),
      description: dungeon.description || ''
    })
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async (): Promise<void> => {
    const name = form.name.trim()
    const rooms = parseInt(form.expected_rooms)

    if (!name) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (isNaN(rooms) || rooms < 1) {
      setFormError('El número de salas debe ser al menos 1')
      return
    }

    setSaving(true)
    setFormError(null)

    const success = editingId
      ? await update(editingId, name, rooms, form.description || undefined)
      : await create(name, rooms, form.description || undefined)

    setSaving(false)

    if (success) {
      setShowForm(false)
    } else {
      setFormError('Error al guardar. Verificá los datos.')
    }
  }

  if (loading) return <LoadingSpinner message="Cargando mazmorras..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">🏰 Gestión de Mazmorras</h1>
        <Button onClick={openCreate}>+ Nueva Mazmorra</Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {dungeons.length === 0 ? (
        <EmptyState
          icon="🏰"
          title="No hay mazmorras registradas"
          description="Creá tu primera mazmorra para empezar a registrar runs."
          action={<Button onClick={openCreate}>Crear Mazmorra</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dungeons.map((d) => (
            <Card key={d.id} gold>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-secondary">{d.name}</h3>
                  <p className="text-sm text-text-muted mt-1">
                    📍 {d.expected_rooms} salas
                  </p>
                  {d.description && (
                    <p className="text-sm text-text-dark mt-2">{d.description}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                  ✏️
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Mazmorra' : 'Nueva Mazmorra'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingId ? 'Guardar Cambios' : 'Crear Mazmorra'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <ErrorMessage message={formError} />}
          <Input
            label="Nombre"
            placeholder="Ej: Mazmorra Jalató"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Número de salas"
            type="number"
            min={1}
            placeholder="Ej: 10"
            value={form.expected_rooms}
            onChange={(e) => setForm({ ...form, expected_rooms: e.target.value })}
          />
          <TextArea
            label="Descripción (opcional)"
            placeholder="Notas sobre la mazmorra..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}
