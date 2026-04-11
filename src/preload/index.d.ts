import { ElectronAPI } from '@electron-toolkit/preload'
import type { DrtApi } from '../renderer/src/types/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: DrtApi
  }
}
