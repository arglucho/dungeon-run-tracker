import { ipcMain, dialog, BrowserWindow } from 'electron'
import { dungeonService } from '../services/dungeonService'
import { resourceService } from '../services/resourceService'
import { runService } from '../services/runService'
import { roomService } from '../services/roomService'
import { statsService } from '../services/statsService'
import { exportService } from '../services/exportService'

function wrapHandler<T>(fn: () => T): { success: boolean; data?: T; error?: string } {
  try {
    const data = fn()
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[IPC Error]', message)
    return { success: false, error: message }
  }
}

export function registerIpcHandlers(): void {
  // === MAZMORRAS ===
  ipcMain.handle('dungeon:getAll', () => wrapHandler(() => dungeonService.getAll()))
  ipcMain.handle('dungeon:getById', (_, id: number) =>
    wrapHandler(() => dungeonService.getById(id))
  )
  ipcMain.handle('dungeon:create', (_, input) => wrapHandler(() => dungeonService.create(input)))
  ipcMain.handle('dungeon:update', (_, id: number, input) =>
    wrapHandler(() => dungeonService.update(id, input))
  )

  // === RECURSOS ===
  ipcMain.handle('resource:getAll', () => wrapHandler(() => resourceService.getAll()))
  ipcMain.handle('resource:search', (_, query: string) =>
    wrapHandler(() => resourceService.search(query))
  )
  ipcMain.handle('resource:create', (_, input) =>
    wrapHandler(() => resourceService.create(input))
  )
  ipcMain.handle('resource:update', (_, id: number, input) =>
    wrapHandler(() => resourceService.update(id, input))
  )
  ipcMain.handle('resource:delete', (_, id: number) =>
    wrapHandler(() => resourceService.delete(id))
  )

  // === RUNS ===
  ipcMain.handle('run:create', (_, input) => wrapHandler(() => runService.create(input)))
  ipcMain.handle('run:getActive', () => wrapHandler(() => runService.getActive()))
  ipcMain.handle('run:getAll', (_, filters) => wrapHandler(() => runService.getAll(filters)))
  ipcMain.handle('run:getById', (_, id: number) => wrapHandler(() => runService.getById(id)))
  ipcMain.handle('run:finish', (_, id: number) => wrapHandler(() => runService.finish(id)))
  ipcMain.handle('run:abandon', (_, id: number) => wrapHandler(() => runService.abandon(id)))
  ipcMain.handle('run:delete', (_, id: number) => wrapHandler(() => runService.delete(id)))
  ipcMain.handle('run:update', (_, id: number, input) =>
    wrapHandler(() => runService.update(id, input))
  )

  // === SALAS ===
  ipcMain.handle('room:add', (_, input) => wrapHandler(() => roomService.add(input)))
  ipcMain.handle('room:update', (_, id: number, input) =>
    wrapHandler(() => roomService.update(id, input))
  )
  ipcMain.handle('room:deleteLast', (_, runId: number) =>
    wrapHandler(() => roomService.deleteLast(runId))
  )
  ipcMain.handle('room:getByRun', (_, runId: number) =>
    wrapHandler(() => roomService.getByRun(runId))
  )

  // === ESTADÍSTICAS ===
  ipcMain.handle('stats:global', (_, filters) =>
    wrapHandler(() => statsService.getGlobal(filters))
  )
  ipcMain.handle('stats:byRoom', (_, dungeonId: number, filters) =>
    wrapHandler(() => statsService.getByRoom(dungeonId, filters))
  )
  ipcMain.handle('stats:byResource', (_, filters) =>
    wrapHandler(() => statsService.getByResource(filters))
  )
  ipcMain.handle('stats:temporal', (_, filters) =>
    wrapHandler(() => statsService.getTemporal(filters))
  )
  ipcMain.handle('stats:compare', (_, runIds: number[]) =>
    wrapHandler(() => statsService.compare(runIds))
  )

  // === EXPORT/IMPORT ===
  ipcMain.handle('export:runJSON', (_, runId: number) =>
    wrapHandler(() => exportService.exportRunJSON(runId))
  )
  ipcMain.handle('export:allRunsJSON', () =>
    wrapHandler(() => exportService.exportAllRunsJSON())
  )
  ipcMain.handle('export:runPDF', (_, runId: number) =>
    wrapHandler(() => exportService.exportRunPDF(runId))
  )
  ipcMain.handle('export:backup', () => wrapHandler(() => exportService.createBackup()))
  ipcMain.handle('export:restoreBackup', () =>
    wrapHandler(() => exportService.restoreBackup())
  )
  ipcMain.handle('export:importJSON', () =>
    wrapHandler(() => exportService.importRunsJSON())
  )

  // === DIÁLOGOS NATIVOS ===
  ipcMain.handle(
    'dialog:saveFile',
    async (_, defaultName: string, filters: { name: string; extensions: string[] }[]) => {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) return { success: false, error: 'No hay ventana activa' }

      const result = await dialog.showSaveDialog(window, {
        defaultPath: defaultName,
        filters
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Operación cancelada' }
      }

      return { success: true, data: result.filePath }
    }
  )

  ipcMain.handle(
    'dialog:openFile',
    async (_, filters: { name: string; extensions: string[] }[]) => {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) return { success: false, error: 'No hay ventana activa' }

      const result = await dialog.showOpenDialog(window, {
        filters,
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Operación cancelada' }
      }

      return { success: true, data: result.filePaths[0] }
    }
  )
}
