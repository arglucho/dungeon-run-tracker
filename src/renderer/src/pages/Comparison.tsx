import { useState, useEffect } from 'react'
import { Card, Button, LoadingSpinner, ErrorMessage, EmptyState } from '../components'

interface RunOption {
  id: number
  dungeon_name: string
  start_time: string
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  status: string
}

interface CompareData {
  id: number
  dungeon_name: string
  total_xp: number
  total_kamas: number
  total_time_seconds: number
  xp_per_minute: number
  kamas_per_minute: number
  room_count: number
}

export function Comparison(): React.JSX.Element {
  const [runs, setRuns] = useState<RunOption[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [comparison, setComparison] = useState<CompareData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRuns = async (): Promise<void> => {
      try {
        const result = await window.api.runGetAll({ status: 'COMPLETED' })
        if (result.success) {
          setRuns(result.data as RunOption[])
        }
      } catch {
        setError('Error al cargar runs')
      } finally {
        setLoading(false)
      }
    }
    fetchRuns()
  }, [])

  const toggleSelect = (id: number): void => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setComparison(null)
  }

  const handleCompare = async (): Promise<void> => {
    if (selected.length < 2) return
    setComparing(true)
    setError(null)
    try {
      const result = await window.api.statsCompare(selected)
      if (result.success) {
        const data = result.data as { runs: CompareData[] } | CompareData[]
        setComparison(Array.isArray(data) ? data : data.runs)
      } else {
        setError(result.error ?? 'Error al comparar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setComparing(false)
    }
  }

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  const formatDate = (d: string): string => {
    try {
      return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return d }
  }

  if (loading) return <LoadingSpinner message="Cargando runs..." />

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-4">⚔️ Comparar Runs</h1>

      {error && <ErrorMessage message={error} />}

      {runs.length < 2 ? (
        <EmptyState icon="⚔️" title="Necesitás al menos 2 runs" description="Completá más runs para usar el comparador." />
      ) : (
        <>
          {/* Selector */}
          <Card className="mb-4">
            <p className="text-sm text-text-muted mb-2">
              Seleccioná las runs a comparar ({selected.length} seleccionadas)
            </p>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {runs.map((run) => (
                <label key={run.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-bg-lighter">
                  <input
                    type="checkbox"
                    checked={selected.includes(run.id)}
                    onChange={() => toggleSelect(run.id)}
                    className="accent-secondary"
                  />
                  <span className="text-sm text-text">
                    #{run.id} — {run.dungeon_name} — {formatDate(run.start_time)} — {run.total_xp.toLocaleString()} XP
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <Button onClick={handleCompare} disabled={selected.length < 2} loading={comparing}>
                Comparar ({selected.length})
              </Button>
            </div>
          </Card>

          {/* Resultado */}
          {comparison && (
            <Card gold>
              <h2 className="text-lg font-bold text-secondary mb-3">Comparación</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-text-muted">Métrica</th>
                      {comparison.map((c) => (
                        <th key={c.id} className="text-right p-2 text-text-muted">#{c.id}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-dark">
                      <td className="p-2 text-text-muted">Mazmorra</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-text">{c.dungeon_name}</td>)}
                    </tr>
                    <tr className="border-b border-border-dark">
                      <td className="p-2 text-text-muted">XP Total</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-secondary font-bold">{c.total_xp.toLocaleString()}</td>)}
                    </tr>
                    <tr className="border-b border-border-dark">
                      <td className="p-2 text-text-muted">Kamas</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-secondary font-bold">{c.total_kamas.toLocaleString()}</td>)}
                    </tr>
                    <tr className="border-b border-border-dark">
                      <td className="p-2 text-text-muted">Tiempo</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-text">{formatTime(c.total_time_seconds)}</td>)}
                    </tr>
                    <tr className="border-b border-border-dark">
                      <td className="p-2 text-text-muted">XP/min</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-accent-light font-bold">{Math.round(c.xp_per_minute).toLocaleString()}</td>)}
                    </tr>
                    <tr className="border-b border-border-dark">
                      <td className="p-2 text-text-muted">Kamas/min</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-text">{Math.round(c.kamas_per_minute).toLocaleString()}</td>)}
                    </tr>
                    <tr>
                      <td className="p-2 text-text-muted">Salas</td>
                      {comparison.map((c) => <td key={c.id} className="text-right p-2 text-text">{c.room_count}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
