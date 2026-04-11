import { useState } from 'react'
import { useResources } from '../hooks'
import { Button, Card, Input, Modal, ConfirmModal, LoadingSpinner, ErrorMessage, EmptyState } from '../components'

export function Resources(): React.JSX.Element {
  const { resources, loading, error, create, update, remove } = useResources()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredResources = searchQuery
    ? resources.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : resources

  const openCreate = (): void => {
    setEditingId(null)
    setName('')
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (resource: { id: number; name: string }): void => {
    setEditingId(resource.id)
    setName(resource.name)
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) {
      setFormError('El nombre es obligatorio')
      return
    }

    setSaving(true)
    setFormError(null)

    const success = editingId ? await update(editingId, trimmed) : await create(trimmed)

    setSaving(false)

    if (success) {
      setShowForm(false)
    } else {
      setFormError('Error al guardar. Puede que el nombre ya exista.')
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    setSaving(true)
    await remove(deleteTarget.id)
    setSaving(false)
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner message="Cargando recursos..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">💎 Gestión de Recursos</h1>
        <Button onClick={openCreate}>+ Nuevo Recurso</Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Búsqueda */}
      <div className="mb-4">
        <Input
          placeholder="🔍 Buscar recurso..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon="💎"
          title="No hay recursos registrados"
          description="Agregá recursos para asociarlos a las salas de tus runs."
          action={<Button onClick={openCreate}>Agregar Recurso</Button>}
        />
      ) : filteredResources.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Sin resultados"
          description={`No se encontraron recursos con "${searchQuery}"`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredResources.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <span className="text-text">{r.name}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget({ id: r.id, name: r.name })}
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-text-dark mt-4">
        {resources.length} recurso{resources.length !== 1 ? 's' : ''} registrado{resources.length !== 1 ? 's' : ''}
      </p>

      {/* Modal formulario */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Recurso' : 'Nuevo Recurso'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingId ? 'Guardar' : 'Crear Recurso'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <ErrorMessage message={formError} />}
          <Input
            label="Nombre del recurso"
            placeholder="Ej: Lana de jalatín blanco"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal confirmación eliminar */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Recurso"
        message={`¿Eliminar el recurso "${deleteTarget?.name}"? Si está en uso, se desactivará.`}
        confirmLabel="Eliminar"
        loading={saving}
      />
    </div>
  )
}
