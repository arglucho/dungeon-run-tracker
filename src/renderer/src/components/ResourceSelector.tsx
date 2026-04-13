import { useState, useEffect, useCallback } from 'react'
import { Input } from './Input'

interface Resource {
  id: number
  name: string
  image_filename: string | null
}

interface ResourceSelectorProps {
  onAdd: (resourceId: number, resourceName: string, quantity: number) => void
  disabled?: boolean
}

function getItemUrl(filename: string | null | undefined): string {
  if (!filename) return 'item://items/not_found.svg'
  return `item://items/${filename}`
}

export function ResourceSelector({ onAdd, disabled = false }: ResourceSelectorProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Resource[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [allResources, setAllResources] = useState<Resource[]>([])

  useEffect(() => {
    window.api.resourceGetAll().then((result) => {
      if (result.success) setAllResources((result.data ?? []) as Resource[])
    })
  }, [])

  const resourcesWithImages = allResources.filter((r) => r.image_filename)

  const searchResources = useCallback(async (q: string): Promise<void> => {
    if (q.trim().length === 0) {
      setResults([])
      setShowDropdown(false)
      return
    }
    try {
      const result = await window.api.resourceSearch(q)
      const data = result.success ? (result.data ?? []) : []
      setResults(data as Resource[])
      setShowDropdown(data.length > 0)
    } catch {
      setResults([])
    }
  }, [])

  useEffect(() => {
    if (selectedResource) return
    const timer = setTimeout(() => searchResources(query), 200)
    return () => clearTimeout(timer)
  }, [query, searchResources, selectedResource])

  const handleSelect = (resource: Resource): void => {
    setSelectedResource(resource)
    setQuery(resource.name)
    setShowDropdown(false)
  }

  const handleAdd = (): void => {
    if (!selectedResource) return
    const qty = parseInt(quantity) || 1
    if (qty < 1) return
    onAdd(selectedResource.id, selectedResource.name, qty)
    setQuery('')
    setSelectedResource(null)
    setQuantity('1')
    setResults([])
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-muted">Agregar recurso</span>
      <div className="flex gap-2 items-end">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar recurso..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedResource(null)
            }}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            disabled={disabled}
          />
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-bg-card border border-border rounded-md shadow-lg max-h-40 overflow-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-lighter cursor-pointer flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(r)}
                >
                  {r.image_filename && (
                    <img
                      src={getItemUrl(r.image_filename)}
                      alt=""
                      className="w-5 h-5 object-contain flex-shrink-0"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-16 px-2 py-2 bg-bg-input border border-border rounded text-text text-center"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedResource || disabled}
          className="px-3 py-2 bg-accent hover:bg-accent-light text-text border border-accent-dark rounded disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-sm"
        >
          + Agregar
        </button>
      </div>

      {/* Galería de imágenes */}
      {resourcesWithImages.length > 0 && !disabled && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text-dark">O seleccioná desde la galería:</span>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-bg-input border border-border rounded-md">
            {resourcesWithImages.map((r) => (
              <button
                key={r.id}
                type="button"
                title={r.name}
                onClick={() => handleSelect(r)}
                className={`
                  flex items-center justify-center w-10 h-10 rounded border-2 transition-colors cursor-pointer flex-shrink-0
                  ${selectedResource?.id === r.id
                    ? 'border-secondary bg-bg-lighter'
                    : 'border-transparent hover:border-border hover:bg-bg-lighter'
                  }
                `}
              >
                <img
                  src={getItemUrl(r.image_filename)}
                  alt={r.name}
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src = getItemUrl('not_found.svg')
                  }}
                />
              </button>
            ))}
          </div>
          {selectedResource && (
            <span className="text-xs text-secondary">
              Seleccionado: <strong>{selectedResource.name}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
