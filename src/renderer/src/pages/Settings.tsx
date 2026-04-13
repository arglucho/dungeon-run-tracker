import { useState } from 'react'
import { Button, Card } from '../components'

export function Settings(): React.JSX.Element {
  const [backupStatus, setBackupStatus] = useState<string | null>(null)

  const handleBackup = async (): Promise<void> => {
    try {
      const result = await window.api.createBackup()
      if (result.success) {
        setBackupStatus('✅ Backup creado correctamente')
      } else {
        if (result.error !== 'Operación cancelada') {
          setBackupStatus(`❌ ${result.error}`)
        }
      }
    } catch {
      setBackupStatus('❌ Error al crear backup')
    }
  }

  const handleRestore = async (): Promise<void> => {
    try {
      const result = await window.api.restoreBackup()
      if (result.success) {
        setBackupStatus('✅ Backup restaurado correctamente')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        if (result.error !== 'Operación cancelada') {
          setBackupStatus(`❌ ${result.error}`)
        }
      }
    } catch {
      setBackupStatus('❌ Error al restaurar backup')
    }
  }

  const handleMock = async (): Promise<void> => {
    try {
      const result = await window.api.mockGenerate(50)
      if (result.success) {
        setBackupStatus(`✅ ${result.data?.generated ?? 0} runs mock generadas`)
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch {
      setBackupStatus('❌ Error al generar datos mock')
    }
  }

  const isDev = import.meta.env.DEV

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-6">⚙️ Opciones</h1>

      {backupStatus && (
        <div className="mb-4 p-3 bg-bg-lighter border border-border rounded text-sm text-text">
          {backupStatus}
        </div>
      )}

      {/* Backup */}
      <Card title="💾 Backup" className="mb-4">
        <p className="text-sm text-text-muted mb-3">
          Creá una copia de seguridad de la base de datos o restaurá una existente.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleBackup}>
            💾 Crear Backup
          </Button>
          <Button variant="ghost" onClick={handleRestore}>
            📂 Restaurar Backup
          </Button>
        </div>
      </Card>

      {/* Mock Data - solo dev */}
      {isDev && (
        <Card title="🧪 Datos de Prueba" className="mb-4">
          <p className="text-sm text-text-muted mb-3">
            Generá runs de prueba para desarrollo. Solo visible en modo desarrollo.
          </p>
          <Button variant="ghost" onClick={handleMock}>
            🧪 Generar 50 Runs Mock
          </Button>
        </Card>
      )}
    </div>
  )
}
