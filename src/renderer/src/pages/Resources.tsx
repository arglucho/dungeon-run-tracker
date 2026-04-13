import { useState, useEffect } from 'react'
import { useResources } from '../hooks'
import { Button, Card, Input, TextArea, Modal, ConfirmModal, LoadingSpinner, ErrorMessage, EmptyState } from '../components'

function getItemUrl(filename: string | null | undefined): string {
  if (!filename) return 'item://items/not_found.svg'
  return `item://items/${filename}`
}

interface ImagePickerProps {
  value: string
  onChange: (filename: string) => void
}

function ImagePicker({ value, onChange }: ImagePickerProps): React.JSX.Element {
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.resourceListImages().then((result) => {
      setImages(result.success ? (result.data ?? []) : [])
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-xs text-text-dark">Cargando imágenes...</p>
  if (images.length === 0)
    return (
      <p className="text-xs text-text-dark">
        No hay imágenes disponibles. Colocá archivos .svg en{' '}
        <code className="text-secondary">resources/items/</code>.
      </p>
    )

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-muted">
        Imagen <span className="text-danger-light">*</span>
      </span>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2 max-h-48 overflow-y-auto p-1 bg-bg-input border border-border rounded-md">
        {images.map((img) => (
          <button
            key={img}
            type="button"
            title={img.replace('.svg', '')}
            onClick={() => onChange(img)}
            className={`
              flex items-center justify-center w-12 h-12 rounded border-2 transition-colors cursor-pointer
              ${value === img ? 'border-secondary bg-bg-lighter' : 'border-transparent hover:border-border hover:bg-bg-lighter'}
            `}
          >
            <img
              src={getItemUrl(img)}
              alt={img.replace('.svg', '')}
              className="w-9 h-9 object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = getItemUrl('not_found.svg')
              }}
            />
          </button>
        ))}
      </div>
      {value && (
        <div className="flex items-center gap-2">
          <img
            src={getItemUrl(value)}
            alt={value}
            className="w-8 h-8 object-contain"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = getItemUrl('not_found.svg')
            }}
          />
          <span className="text-xs text-text-muted">{value}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-danger-light hover:text-danger cursor-pointer ml-auto"
          >
            ✕ Quitar imagen
          </button>
        </div>
      )}
    </div>
  )
}

export function Resources(): React.JSX.Element {
  const { resources, loading, error, create, update, remove } = useResources()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [imageFilename, setImageFilename] = useState('')
  const [pods, setPods] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredResources = searchQuery
    ? resources.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : resources

  const resetForm = (): void => {
    setName('')
    setImageFilename('')
    setPods('')
    setLevel('')
    setDescription('')
    setFormError(null)
  }

  const openCreate = (): void => {
    setEditingId(null)
    resetForm()
    setShowForm(true)
  }

  const openEdit = (resource: {
    id: number
    name: string
    image_filename: string | null
    pods: number | null
    level: number | null
    description: string | null
  }): void => {
    setEditingId(resource.id)
    setName(resource.name)
    setImageFilename(resource.image_filename ?? '')
    setPods(resource.pods != null ? String(resource.pods) : '')
    setLevel(resource.level != null ? String(resource.level) : '')
    setDescription(resource.description ?? '')
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

    const input = {
      name: trimmed,
      image_filename: imageFilename.trim() || null,
      pods: pods.trim() ? parseFloat(pods) : null,
      level: level.trim() ? parseInt(level) : null,
      description: description.trim() || null
    }

    const success = editingId ? await update(editingId, input) : await create(input)

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
              <div className="flex items-center gap-3">
                <img
                  src={getItemUrl(r.image_filename)}
                  alt={r.name}
                  className="w-10 h-10 object-contain flex-shrink-0"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src = getItemUrl('not_found.svg')
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-text font-medium block truncate">{r.name}</span>
                  <div className="flex gap-3 mt-0.5">
                    {r.pods != null && (
                      <span className="text-xs text-text-dark">⚖️ {r.pods}</span>
                    )}
                    {r.level != null && (
                      <span className="text-xs text-text-dark">⭐ Nv.{r.level}</span>
                    )}
                  </div>
                  {r.description && (
                    <span className="text-xs text-text-dark line-clamp-1">{r.description}</span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
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
            label="Nombre del recurso *"
            placeholder="Ej: Lana de jalatín blanco"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <ImagePicker value={imageFilename} onChange={setImageFilename} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pods (peso)"
              placeholder="Ej: 1"
              type="number"
              min={0}
              step="0.1"
              value={pods}
              onChange={(e) => setPods(e.target.value)}
            />
            <Input
              label="Nivel"
              placeholder="Ej: 20"
              type="number"
              min={1}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </div>
          <TextArea
            label="Descripción"
            placeholder="Descripción opcional del recurso..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
