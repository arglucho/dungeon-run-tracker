import type { Dungeon, CreateDungeonInput, UpdateDungeonInput } from './dungeon'
import type { Run, RunWithDetails, CreateRunInput, UpdateRunInput, RunFilters } from './run'
import type { Room, RoomWithResources, CreateRoomInput, UpdateRoomInput } from './room'
import type { Resource, CreateResourceInput, UpdateResourceInput } from './resource'
import type {
  GlobalStats,
  RoomStats,
  ResourceStats,
  TemporalStats,
  StatsFilters,
  RunComparison
} from './stats'

export interface ServiceResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface DrtApi {
  // Mazmorras
  dungeonGetAll(): Promise<ServiceResult<Dungeon[]>>
  dungeonGetById(id: number): Promise<ServiceResult<Dungeon>>
  dungeonCreate(input: CreateDungeonInput): Promise<ServiceResult<{ id: number }>>
  dungeonUpdate(id: number, input: UpdateDungeonInput): Promise<ServiceResult>

  // Recursos
  resourceGetAll(): Promise<ServiceResult<Resource[]>>
  resourceSearch(query: string): Promise<ServiceResult<Resource[]>>
  resourceCreate(input: CreateResourceInput): Promise<ServiceResult<{ id: number }>>
  resourceUpdate(id: number, input: UpdateResourceInput): Promise<ServiceResult>
  resourceDelete(id: number): Promise<ServiceResult>

  // Runs
  runCreate(input: CreateRunInput): Promise<ServiceResult<{ id: number }>>
  runGetActive(): Promise<ServiceResult<RunWithDetails | null>>
  runGetAll(filters?: RunFilters): Promise<ServiceResult<Run[]>>
  runGetById(id: number): Promise<ServiceResult<RunWithDetails>>
  runFinish(id: number): Promise<ServiceResult>
  runAbandon(id: number): Promise<ServiceResult>
  runDelete(id: number): Promise<ServiceResult>
  runUpdate(id: number, input: UpdateRunInput): Promise<ServiceResult>

  // Salas
  roomAdd(input: CreateRoomInput): Promise<ServiceResult<{ id: number; run_finished: boolean }>>
  roomUpdate(id: number, input: UpdateRoomInput): Promise<ServiceResult>
  roomDeleteLast(runId: number): Promise<ServiceResult>
  roomGetByRun(runId: number): Promise<ServiceResult<RoomWithResources[]>>

  // Estadísticas
  statsGlobal(filters?: StatsFilters): Promise<ServiceResult<GlobalStats>>
  statsByRoom(dungeonId: number, filters?: StatsFilters): Promise<ServiceResult<RoomStats[]>>
  statsByResource(filters?: StatsFilters): Promise<ServiceResult<ResourceStats[]>>
  statsTemporal(filters?: StatsFilters): Promise<ServiceResult<TemporalStats[]>>
  statsCompare(runIds: number[]): Promise<ServiceResult<RunComparison>>

  // Export/Import
  exportRunJSON(runId: number): Promise<ServiceResult<string>>
  exportAllRunsJSON(): Promise<ServiceResult<string>>
  exportRunPDF(runId: number): Promise<ServiceResult<Uint8Array>>
  createBackup(): Promise<ServiceResult<string>>
  restoreBackup(): Promise<ServiceResult>
  importRunsJSON(): Promise<ServiceResult<{ imported: number }>>

  // Diálogos nativos
  dialogSaveFile(defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<ServiceResult<string>>
  dialogOpenFile(filters: { name: string; extensions: string[] }[]): Promise<ServiceResult<string>>

  // Mock (solo dev)
  mockGenerate(count: number): Promise<ServiceResult<{ generated: number }>>
}
