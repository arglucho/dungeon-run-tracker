import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeDatabase, runMigrations, seedDatabase, closeDatabase, getDatabase } from './database'
import { registerIpcHandlers } from './ipc/handlers'

let forceQuit = false

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Close protection: warn if there's an active run
  mainWindow.on('close', (e) => {
    if (forceQuit) return

    try {
      const db = getDatabase()
      const activeRun = db.prepare("SELECT id FROM runs WHERE status = 'IN_PROGRESS' LIMIT 1").get()
      if (activeRun) {
        const choice = dialog.showMessageBoxSync(mainWindow, {
          type: 'warning',
          title: 'Run en progreso',
          message: 'Tenés una run en progreso. ¿Seguro que querés salir?',
          detail: 'La run quedará en estado "En progreso" y podrás continuarla al reabrir la app.',
          buttons: ['Cancelar', 'Salir'],
          defaultId: 0,
          cancelId: 0
        })
        if (choice === 0) {
          e.preventDefault()
        }
      }
    } catch {
      // If DB check fails, allow close
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.dungeon-run-tracker')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Inicializar base de datos
  try {
    initializeDatabase()
    runMigrations()
    seedDatabase()
    console.log('Base de datos inicializada correctamente')
  } catch (error) {
    console.error('Error al inicializar base de datos:', error)
  }

  // Registrar IPC handlers
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  closeDatabase()
})
