import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Mazmorras
  dungeonGetAll: () => ipcRenderer.invoke('dungeon:getAll'),
  dungeonGetById: (id: number) => ipcRenderer.invoke('dungeon:getById', id),
  dungeonCreate: (input: unknown) => ipcRenderer.invoke('dungeon:create', input),
  dungeonUpdate: (id: number, input: unknown) => ipcRenderer.invoke('dungeon:update', id, input),

  // Recursos
  resourceGetAll: () => ipcRenderer.invoke('resource:getAll'),
  resourceSearch: (query: string) => ipcRenderer.invoke('resource:search', query),
  resourceCreate: (input: unknown) => ipcRenderer.invoke('resource:create', input),
  resourceUpdate: (id: number, input: unknown) => ipcRenderer.invoke('resource:update', id, input),
  resourceDelete: (id: number) => ipcRenderer.invoke('resource:delete', id),

  // Runs
  runCreate: (input: unknown) => ipcRenderer.invoke('run:create', input),
  runGetActive: () => ipcRenderer.invoke('run:getActive'),
  runGetAll: (filters?: unknown) => ipcRenderer.invoke('run:getAll', filters),
  runGetById: (id: number) => ipcRenderer.invoke('run:getById', id),
  runFinish: (id: number) => ipcRenderer.invoke('run:finish', id),
  runAbandon: (id: number) => ipcRenderer.invoke('run:abandon', id),
  runDelete: (id: number) => ipcRenderer.invoke('run:delete', id),
  runUpdate: (id: number, input: unknown) => ipcRenderer.invoke('run:update', id, input),

  // Salas
  roomAdd: (input: unknown) => ipcRenderer.invoke('room:add', input),
  roomUpdate: (id: number, input: unknown) => ipcRenderer.invoke('room:update', id, input),
  roomDeleteLast: (runId: number) => ipcRenderer.invoke('room:deleteLast', runId),
  roomGetByRun: (runId: number) => ipcRenderer.invoke('room:getByRun', runId),

  // Estadísticas
  statsGlobal: (filters?: unknown) => ipcRenderer.invoke('stats:global', filters),
  statsByRoom: (dungeonId: number, filters?: unknown) =>
    ipcRenderer.invoke('stats:byRoom', dungeonId, filters),
  statsByResource: (filters?: unknown) => ipcRenderer.invoke('stats:byResource', filters),
  statsTemporal: (filters?: unknown) => ipcRenderer.invoke('stats:temporal', filters),
  statsCompare: (runIds: number[]) => ipcRenderer.invoke('stats:compare', runIds),

  // Export/Import
  exportRunJSON: (runId: number) => ipcRenderer.invoke('export:runJSON', runId),
  exportAllRunsJSON: () => ipcRenderer.invoke('export:allRunsJSON'),
  exportRunPDF: (runId: number) => ipcRenderer.invoke('export:runPDF', runId),
  createBackup: () => ipcRenderer.invoke('export:backup'),
  restoreBackup: () => ipcRenderer.invoke('export:restoreBackup'),
  importRunsJSON: () => ipcRenderer.invoke('export:importJSON'),

  // Diálogos nativos
  dialogSaveFile: (defaultName: string, filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:saveFile', defaultName, filters),
  dialogOpenFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
