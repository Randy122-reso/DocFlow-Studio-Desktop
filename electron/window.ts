import { BrowserWindow, dialog, type MessageBoxOptions } from 'electron'
import { join } from 'node:path'
import type { I18nService } from './services/I18nService'
import type { SettingsService } from './services/SettingsService'
import type { DirtyState, TabSnapshot, WindowBounds, WindowInfo } from './types/ipc'

export interface WindowController {
  id: string
  window: BrowserWindow
  isDirty: boolean
  allowClose: boolean
  filePath: string | null
  fileName: string
  initialTabs: TabSnapshot[]
  initialActiveTabId: string | null
  setDirty(state: DirtyState): void
  confirmClose(): void
  info(): WindowInfo
}

export interface CreateWindowOptions {
  id: string
  preloadPath: string
  settings: SettingsService
  i18n: I18nService
  isDev: boolean
  devToolsEnabled: boolean
  initialTabs?: TabSnapshot[]
  initialActiveTabId?: string | null
  initialBounds?: WindowBounds
  visible?: boolean
  shouldMinimizeToTray: () => boolean
  isQuitting: () => boolean
  onBoundsChanged?: (id: string, bounds: WindowBounds) => void
  onClosed?: (id: string) => void
}

export function createMainWindow(options: CreateWindowOptions): WindowController {
  const bounds = options.initialBounds ?? options.settings.get('windowBounds')
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

  const visible = options.visible !== false
  win.once('ready-to-show', () => {
    if (visible) win.show()
    else win.showInactive()
  })

  const controller: WindowController = {
    id: options.id,
    window: win,
    isDirty: false,
    allowClose: false,
    filePath: null,
    fileName: 'Untitled',
    initialTabs: options.initialTabs ?? [],
    initialActiveTabId: options.initialActiveTabId ?? null,
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
    },
    info(): WindowInfo {
      const current = win.getNormalBounds()
      return {
        id: controller.id,
        bounds: { width: current.width, height: current.height, x: current.x, y: current.y },
        maximized: win.isMaximized(),
        fullScreen: win.isFullScreen(),
        initialTabs: controller.initialTabs,
        activeTabId: controller.initialActiveTabId
      }
    }
  }

  let pendingClose = false
  win.on('close', (event) => {
    if (controller.allowClose) return
    if (!options.isQuitting() && options.shouldMinimizeToTray()) {
      event.preventDefault()
      win.hide()
      return
    }
    if (!controller.isDirty) {
      controller.allowClose = true
      return
    }
    event.preventDefault()
    if (pendingClose) return
    pendingClose = true

    const messageOptions: MessageBoxOptions = {
      type: 'warning',
      buttons: [
        options.i18n.t('dialog.save'),
        options.i18n.t('dialog.discard'),
        options.i18n.t('dialog.cancel')
      ],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: options.i18n.t('dialog.unsavedTitle'),
      message: options.i18n.t('dialog.unsavedMessage', { name: controller.fileName }),
      detail: options.i18n.t('dialog.unsavedDetail')
    }

    void dialog.showMessageBox(win, messageOptions).then((result) => {
      pendingClose = false
      if (result.response === 0) {
        win.webContents.send('app:action', { action: 'request-save-and-close' })
      } else if (result.response === 1) {
        win.webContents.send('app:action', { action: 'discard-and-close' })
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
      options.onBoundsChanged?.(controller.id, {
        width: current.width,
        height: current.height,
        x: current.x,
        y: current.y
      })
    }, 400)
  }
  win.on('resize', persistBounds)
  win.on('move', persistBounds)

  win.on('closed', () => {
    if (boundsTimer) clearTimeout(boundsTimer)
    options.onClosed?.(controller.id)
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  return controller
}
