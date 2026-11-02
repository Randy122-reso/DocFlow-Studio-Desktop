import { app, dialog, session as electronSession, Tray, nativeImage, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { loadConfig, type AppConfig } from './utils/config'
import { getDataPaths } from './utils/paths'
import { Logger } from './utils/logger'
import { LocalFsProvider } from './services/LocalFsProvider'
import { FileService } from './services/FileService'
import { FileWatcherService } from './services/FileWatcher'
import { RecentFilesService } from './services/RecentFilesService'
import { SettingsService } from './services/SettingsService'
import { SessionService } from './services/SessionService'
import { DialogService } from './services/DialogService'
import { OpenFileRouter } from './services/OpenFileRouter'
import { createMainWindow, type WindowController } from './window'
import { applyMenu } from './menu'
import { Menu } from 'electron'
import { registerIpc } from './ipc'
import type { RecentFile } from './types/ipc'

const isDev = !app.isPackaged
const router = new OpenFileRouter()
router.ingestArgv(process.argv)

let config: AppConfig
try {
  config = loadConfig()
} catch (error) {
  dialog.showErrorBox('DocFlow Studio — configuration error', error instanceof Error ? error.message : String(error))
  app.exit(1)
  throw error
}

if (config.userDataDir) {
  app.setPath('userData', config.userDataDir)
}

const dataPaths = getDataPaths()
const logger = new Logger({
  dir: dataPaths.logs,
  level: config.logLevel,
  maxFiles: config.logMaxFiles,
  maxSizeMb: config.logMaxSizeMb
})

logger.info('Boot', {
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  dev: isDev
})

let controller: WindowController | null = null
let tray: Tray | null = null
let recent: RecentFilesService
let settings: SettingsService
let sessionService: SessionService
let dialogs: DialogService
let watcher: FileWatcherService
let fileService: FileService

const getWindow = (): BrowserWindow | null => {
  if (!controller || controller.window.isDestroyed()) return null
  return controller.window
}

function send(channel: string, payload: unknown): void {
  const window = getWindow()
  if (window) window.webContents.send(channel, payload)
}

function rebuildMenu(): void {
  applyMenu({
    isDev,
    getRecent: () => recent.list(),
    sendAction: (action, payload) => send('app:action', { action, payload }),
    openRecent: (path) => send('app:open-file', { path }),
    clearRecent: () => {
      void recent.clear(false).then((files) => handleRecentChanged(files))
    }
  })
}

function handleRecentChanged(files: RecentFile[]): void {
  rebuildMenu()
  send('recent:changed', files)
}

function applyCsp(): void {
  if (isDev || !config.cspEnabled) return
  electronSession.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
        ]
      }
    })
  })
}

async function bootstrap(): Promise<void> {
  await mkdir(dataPaths.cache, { recursive: true })
  applyCsp()

  settings = new SettingsService(dataPaths.settings)
  await settings.init()

  recent = new RecentFilesService(dataPaths.recent, {
    max: config.recentMax,
    ttlDays: config.recentTtlDays
  })
  await recent.init()
  recent.setChangeListener((files) => handleRecentChanged(files))

  sessionService = new SessionService(dataPaths.session)
  dialogs = new DialogService({ e2eMode: config.e2eMode, e2eSavePath: config.e2eSavePath })
  const lastOpenedDir = settings.get('lastOpenedDir')
  const lastExportDir = settings.get('lastExportDir')
  dialogs.setLastOpenedDir(lastOpenedDir)
  dialogs.setLastExportDir(lastExportDir)

  watcher = new FileWatcherService(config.watchDebounceMs)
  const provider = new LocalFsProvider({
    maxFileSizeBytes: config.maxFileSizeMb * 1024 * 1024,
    defaultEncoding: config.encoding
  })
  fileService = new FileService(provider, {
    watcher,
    onRead: (path, size) => logger.fileEvent('file:read', path, size),
    onWrite: (path, size) => logger.fileEvent('file:write', path, size)
  })

  const preloadPath = join(__dirname, '../preload/preload.js')
  controller = createMainWindow({
    preloadPath,
    settings,
    session: sessionService,
    isDev,
    devToolsEnabled: config.devtoolsEnabled
  })

  registerIpc({
    config,
    logger,
    fileService,
    watcher,
    recent,
    settings,
    session: sessionService,
    dialogs,
    router,
    getWindow,
    getController: () => controller,
    onRecentChanged: handleRecentChanged
  })

  rebuildMenu()

  app.setAboutPanelOptions({
    applicationName: 'DocFlow Studio',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 DocFlow',
    credits: 'Markdown authoring & publication-grade export.',
    website: 'https://github.com/docflow-studio-desktop'
  })

  controller.window.webContents.on('did-finish-load', () => {
    logger.info('Renderer loaded')
    send('app:ready', { version: app.getVersion(), platform: process.platform })
  })

  controller.window.on('minimize', () => {
    // Optional hide-to-tray; keep visible by default.
  })

  controller.window.on('closed', () => {
    controller = null
  })

  function buildTray(): Tray {
    const trayIcon = nativeImage.createFromPath(join(__dirname, '../build/icon.png'))
    const t = new Tray(trayIcon.resize({ width: 16, height: 16 }))
    t.setToolTip('DocFlow Studio — Markdown editor')
    t.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show', click: () => { if (controller?.window) { controller.window.show(); controller.window.focus() } } },
      { label: 'New', click: () => { if (controller?.window) controller.window.webContents.send('app:action', { action: 'new' }) } },
      { label: 'Open…', click: () => { if (controller?.window) controller.window.webContents.send('app:action', { action: 'open' }) } },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]))
    t.on('double-click', () => {
      if (controller?.window) { if (controller.window.isMinimized()) controller.window.restore(); controller.window.show(); controller.window.focus() }
    })
    return t
  }

  tray = buildTray()

  const pending = router.consume()
  if (pending) router.setPending(pending)
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const path = router.extractPathFromArgv(argv)
    const window = getWindow()
    if (window) {
      if (window.isMinimized()) window.restore()
      window.show()
      window.focus()
      if (path) send('app:open-file', { path })
    } else if (path) {
      router.setPending(path)
    }
  })

  app.on('open-file', (event, path) => {
    event.preventDefault()
    const window = getWindow()
    if (window) {
      window.show()
      window.focus()
      send('app:open-file', { path })
    } else {
      router.setPending(path)
    }
  })

  app.whenReady().then(bootstrap).catch((error) => {
    logger.error('Bootstrap failed', error instanceof Error ? error.message : String(error))
    dialog.showErrorBox('DocFlow Studio — startup failed', error instanceof Error ? error.message : String(error))
    app.exit(1)
  })

  app.on('activate', () => {
    if (!getWindow()) {
      void bootstrap()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { tray?.destroy(); tray = null; app.quit() }
  })

  app.on('before-quit', () => {
    void settings?.flush()
    watcher?.closeAll()
    tray?.destroy(); tray = null
    logger.info('Quit')
  })

  app.on('browser-window-blur', () => {
    // Minimal tray interaction placeholder; full tray requires Build F2.
  })
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error.message)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason instanceof Error ? reason.message : String(reason))
})
