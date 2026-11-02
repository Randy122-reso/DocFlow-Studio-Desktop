import { BrowserWindow, dialog, type MessageBoxOptions } from 'electron'
import { join } from 'node:path'
import type { SettingsService } from './services/SettingsService'
import type { SessionService } from './services/SessionService'
import type { DirtyState } from './types/ipc'

export interface WindowController {
  window: BrowserWindow
  isDirty: boolean
  allowClose: boolean
  filePath: string | null
  fileName: string
  setDirty(state: DirtyState): void
  confirmClose(): void
}

export interface CreateWindowOptions {
  preloadPath: string
  settings: SettingsService
  session: SessionService
  isDev: boolean
  devToolsEnabled: boolean
}

export function createMainWindow(options: CreateWindowOptions): WindowController {
  const bounds = options.settings.get('windowBounds')
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x ?? undefined,
    y: bounds.y ?? undefined,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#f4f1ea',
    title: 'DocFlow Studio',
    autoHideMenuBar: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
      devTools: options.devToolsEnabled || options.isDev
    }
  })

  if (options.isDev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  const controller: WindowController = {
    window: win,
    isDirty: false,
    allowClose: false,
    filePath: null,
    fileName: 'Untitled',
    setDirty(state: DirtyState) {
      controller.isDirty = state.dirty
      controller.filePath = state.filePath
      controller.fileName = state.fileName || 'Untitled'
      const marker = state.dirty ? ' •' : ''
      const name = state.fileName || 'Untitled'
      win.setTitle(`${name}${marker} — DocFlow Studio`)
      if (process.platform === 'darwin') {
        win.setDocumentEdited(state.dirty)
      }
    },
    confirmClose() {
      controller.allowClose = true
      win.close()
    }
  }

  let pendingClose = false
  win.on('close', (event) => {
    if (controller.allowClose) return
    if (!controller.isDirty) {
      controller.allowClose = true
      return
    }
    event.preventDefault()
    if (pendingClose) return
    pendingClose = true

    const messageOptions: MessageBoxOptions = {
      type: 'warning',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: 'Unsaved changes',
      message: `Save changes to "${controller.fileName}"?`,
      detail: 'Your changes will be lost if you close without saving.'
    }

    void dialog.showMessageBox(win, messageOptions).then((result) => {
      pendingClose = false
      if (result.response === 0) {
        win.webContents.send('app:action', { action: 'request-save-and-close' })
      } else if (result.response === 1) {
        void options.session.clear().finally(() => {
          controller.allowClose = true
          win.close()
        })
      }
    })
  })

  let boundsTimer: NodeJS.Timeout | null = null
  const persistBounds = () => {
    if (win.isDestroyed() || win.isMinimized() || win.isMaximized() || win.isFullScreen()) return
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      boundsTimer = null
      const current = win.getNormalBounds()
      void options.settings.set({
        windowBounds: {
          width: current.width,
          height: current.height,
          x: current.x,
          y: current.y
        }
      })
    }, 400)
  }
  win.on('resize', persistBounds)
  win.on('move', persistBounds)

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  return controller
}
