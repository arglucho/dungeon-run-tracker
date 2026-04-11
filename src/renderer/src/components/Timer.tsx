import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './Button'

interface TimerProps {
  onTimeSet: (seconds: number) => void
  disabled?: boolean
}

type TimerState = 'idle' | 'running' | 'stopped'

export function Timer({ onTimeSet, disabled = false }: TimerProps): React.JSX.Element {
  const [mode, setMode] = useState<'timer' | 'manual'>('timer')
  const [state, setState] = useState<TimerState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [manualMin, setManualMin] = useState('')
  const [manualSec, setManualSec] = useState('')
  const startRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  const handleStart = (): void => {
    startRef.current = Date.now()
    setState('running')
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
  }

  const handleStop = (): void => {
    stop()
    const finalSeconds = Math.floor((Date.now() - startRef.current) / 1000)
    setElapsed(finalSeconds)
    setState('stopped')
    onTimeSet(finalSeconds)
  }

  const handleReset = (): void => {
    stop()
    setElapsed(0)
    setState('idle')
    onTimeSet(0)
  }

  const handleManualChange = (): void => {
    const min = parseInt(manualMin) || 0
    const sec = parseInt(manualSec) || 0
    const total = min * 60 + sec
    onTimeSet(total)
  }

  const formatTime = (s: number): string => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const stateColors: Record<TimerState, string> = {
    idle: 'text-text-muted',
    running: 'text-accent-light',
    stopped: 'text-secondary'
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-muted">Tiempo</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('timer'); handleReset() }}
            className={`text-xs px-2 py-0.5 rounded cursor-pointer ${mode === 'timer' ? 'bg-primary text-text' : 'text-text-dark hover:text-text'}`}
          >
            ⏱ Cronómetro
          </button>
          <button
            type="button"
            onClick={() => { setMode('manual'); stop(); setState('idle') }}
            className={`text-xs px-2 py-0.5 rounded cursor-pointer ${mode === 'manual' ? 'bg-primary text-text' : 'text-text-dark hover:text-text'}`}
          >
            ✏️ Manual
          </button>
        </div>
      </div>

      {mode === 'timer' ? (
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-mono ${stateColors[state]}`}>
            {formatTime(elapsed)}
          </span>
          <div className="flex gap-2">
            {state === 'idle' && (
              <Button size="sm" variant="accent" onClick={handleStart} disabled={disabled}>
                ▶ Iniciar
              </Button>
            )}
            {state === 'running' && (
              <Button size="sm" variant="danger" onClick={handleStop}>
                ⏹ Detener
              </Button>
            )}
            {state === 'stopped' && (
              <Button size="sm" variant="ghost" onClick={handleReset}>
                ↺ Reset
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={999}
            placeholder="Min"
            value={manualMin}
            onChange={(e) => { setManualMin(e.target.value); }}
            onBlur={handleManualChange}
            className="w-20 px-2 py-1.5 bg-bg-input border border-border rounded text-text text-center"
            disabled={disabled}
          />
          <span className="text-text-muted">:</span>
          <input
            type="number"
            min={0}
            max={59}
            placeholder="Seg"
            value={manualSec}
            onChange={(e) => { setManualSec(e.target.value); }}
            onBlur={handleManualChange}
            className="w-20 px-2 py-1.5 bg-bg-input border border-border rounded text-text text-center"
            disabled={disabled}
          />
          <span className="text-xs text-text-dark">min : seg</span>
        </div>
      )}
    </div>
  )
}
