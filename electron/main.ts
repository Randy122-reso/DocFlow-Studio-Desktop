import { app, dialog, session as electronSession, nativeImage, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
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
import { FileSearchService } from './services/FileSearchService'
import { UpdateService } from './services/UpdateService'
import { ElectronUpdaterProvider } from './services/UpdateServiceProvider'
import { I18nService } from './services/I18nService'
import { TrayService } from './services/TrayService'
import { WindowManager } from './services/WindowManager'
import { ContextMenuService } from './services/ContextMenuService'
import { applyMenu } from './menu'
import { registerIpc } from './ipc'
import type { AppSettings, Locale, RecentFile, ResolvedLocale, SessionState } from './types/ipc'

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

let settings: SettingsService
let recent: RecentFilesService
let sessionService: SessionService
let dialogs: DialogService
let watcher: FileWatcherService
let fileService: FileService
let findService: FileSearchService
let updateService: UpdateService
let i18n: I18nService
let trayService: TrayService
let windows: WindowManager
let contextMenu: ContextMenuService
let lastSettings: AppSettings
let updateTimer: NodeJS.Timeout | null = null
let updateInterval: NodeJS.Timeout | null = null

function focusedWindow(): BrowserWindow | null {
  return windows?.getFocused()?.window ?? null
}

function sendToFocused(channel: string, payload: unknown): void {
  const win = focusedWindow()
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

function handleRecentChanged(files: RecentFile[]): void {
  rebuildMenu()
  trayService?.rebuild()
  windows?.broadcast('recent:changed', files)
}

function resolveTrayIcon(): string {
  const candidates = [
    join(process.resourcesPath, 'tray-16.png'),
    join(app.getAppPath(), 'build', 'tray-16.png'),
    join(__dirname, '../../build/tray-16.png'),
    join(app.getAppPath(), 'build', 'icon.png'),
    join(__dirname, '../../build/icon.png')
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

function rebuildMenu(): void {
  if (!settings || !i18n || !windows) return
  applyMenu({
    isDev,
    i18n,
    getRecent: () => recent.list(),
    sendAction: (action, payload) => sendToFocused('app:action', { action, payload }),
    openRecent: (path) => sendToFocused('app:open-file', { path }),
    clearRecent: () => {
      void recent.clear(false).then((files) => handleRecentChanged(files))
    },
    setLocale: (locale) => {
      const resolved = i18n.setLocale(locale)
      void settings.set({ locale }).then((value) => handleSettingsChanged(value, 'en'))
      windows.broadcast('i18n:localeChanged', { preference: locale, locale: resolved })
    },
    checkForUpdates: () => {
      void updateService.checkForUpdates()
    },
    newWindow: () => {
      try {
        const created = windows.create({})
        created?.window.show()
        created?.window.focus()
      } catch {
        dialog.showMessageBox({
          type: 'warning',
          message: i18n.t('update.error'),
          detail: `MAX_WINDOWS=${config.maxWindows}`
        })
      }
    },
    quit: () => {
      windows.setQuitting(true)
      app.quit()
    }
  })
}

function handleSettingsChanged(next: AppSettings, previousLocale: Locale = lastSettings?.locale ?? 'auto'): void {
  const previous = lastSettings ?? next
  if (lastSettings && JSON.stringify(previous) === JSON.stringify(next)) {
    lastSettings = next
    return
  }
  lastSettings = next
  if (previousLocale !== next.locale) {
    const resolved = i18n.setLocale(next.locale)
    windows.broadcast('i18n:localeChanged', { preference: next.locale, locale: resolved })
  }
  if (previous.updateChannel !== next.updateChannel) {
    updateService.setChannel(next.updateChannel)
  }
  if (previous.tray.enabled !== next.tray.enabled) {
    trayService.setEnabled(next.tray.enabled)
  }
  trayService.rebuild()
  rebuildMenu()
  windows.broadcast('settings:changed', next)
}

function handleLocaleChanged(_locale: Locale, _resolved: ResolvedLocale): void {
  // The settings listener already broadcasts the locale change. Rebuild the
  // native surfaces so their labels match the selected language.
  trayService.rebuild()
  rebuildMenu()
}

function scheduleUpdates(): void {
  if (updateTimer) clearTimeout(updateTimer)
  if (updateInterval) clearInterval(updateInterval)
  updateTimer = setTimeout(() => {
    updateTimer = null
    if (settings.get('autoCheckUpdates')) void updateService.checkForUpdates()
  }, config.updateCheckDelayMs)
  updateInterval = setInterval(() => {
    if (settings.get('autoCheckUpdates')) void updateService.checkForUpdates()
  }, config.updateCheckIntervalMs)
}

function applyCsp(): void {
  if (isDev || !config.cspEnabled) return
  electronSession.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${config.updateFeedUrl}; object-src 'none'; base-uri 'none'; form-action 'none'`
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
  lastSettings = settings.all()

  i18n = new I18nService({ locale: settings.get('locale'), systemLocale: app.getLocale() })

  recent = new RecentFilesService(dataPaths.recent, {
    max: config.recentMax,
    ttlDays: config.recentTtlDays
  })
  await recent.init()
  recent.setChangeListener((files) => handleRecentChanged(files))

  sessionService = new SessionService(dataPaths.session)
  dialogs = new DialogService({ e2eMode: config.e2eMode, e2eSavePath: config.e2eSavePath })
  dialogs.setLastOpenedDir(settings.get('lastOpenedDir'))
  dialogs.setLastExportDir(settings.get('lastExportDir'))

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

  findService = new FileSearchService({
    maxResults: config.findMaxResults,
    maxFileSizeBytes: config.findInFilesMaxFileSizeMb * 1024 * 1024,
    timeoutMs: config.findInFilesTimeoutMs
  })

  updateService = new UpdateService({
    currentVersion: app.getVersion(),
    provider: app.isPackaged ? new ElectronUpdaterProvider() : null,
    channel: settings.get('updateChannel'),
    feedUrl: config.updateFeedUrl,
    requireSignature: config.updateRequireSignature,
    logger,
    onStateChanged: (state) => {
      windows?.broadcast('update:status', state)
      trayService?.setUpdateAvailable(state.status === 'available' || state.status === 'ready')
    }
  })

  contextMenu = new ContextMenuService({
    i18n,
    callbacks: {
      onTabAction: (action, tabId) => sendToFocused('app:tab-action', { action, tabId })
    }
  })

  const preloadPath = join(__dirname, '../preload/preload.js')
  windows = new WindowManager({
    preloadPath,
    settings,
    session: sessionService,
    i18n,
    logger,
    isDev,
    devToolsEnabled: config.devtoolsEnabled,
    maxWindows: config.maxWindows
  })

  const trayIconPath = resolveTrayIcon()
  trayService = new TrayService({
    iconPath: trayIconPath,
    i18n,
    callbacks: {
      showWindow: () => {
        const win = windows.focusFirst()
        if (!win) {
          const created = windows.create({})
          created?.window.show()
        }
      },
      hideWindow: () => poweredWindow()?.hide(),
      newTab: () => sendToFocused('app:action', { action: 'newTab' }),
      openRecent: (path) => sendToFocused('app:open-file', { path }),
      getRecent: () => recent.list(),
      checkForUpdates: () => {
        void updateService.checkForUpdates()
      },
      quit: () => {
        windows.setQuitting(true)
        app.quit()
      }
    }
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
    fileSearch: findService,
    updates: updateService,
    i18n,
    tray: trayService,
    windows,
    contextMenu,
    getFocusedWindow: focusedWindow,
    onRecentChanged: handleRecentChanged,
    onSessionSaved: () => rebuildMenu(),
    onSettingsChanged: (value) => handleSettingsChanged(value),
    onLocaleChanged: handleLocaleChanged
  })

  settings.onChanged((value) => handleSettingsChanged(value))
  trayService.setEnabled(settings.get('tray').enabled)
  rebuildMenu()

  app.setAboutPanelOptions({
    applicationName: 'DocFlow Studio',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 DocFlow',
    credits: 'Markdown authoring & publication-grade export.',
    website: 'https://github.com/docflow-studio-desktop'
  })

  const restored = await sessionService.readSession()
  windows.restore(restored)
  for (const controller of windows.all()) {
    controller.window.webContents.on('did-finish-load', () => {
      logger.info('Renderer loaded', { windowId: controller.id })
      controller.window.webContents.send('app:ready', {
        version: app.getVersion(),
        platform: process.platform
      })
    })
  }

  scheduleUpdates()
}

function poweredWindow(): BrowserWindow | null {
  return focusedWindow()
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const path = router.extractPathFromArgv(argv)
    const window = windows?.focusFirst()
    if (window) {
      if (window.isMinimized()) window.restore()
      window.show()
      window.focus()
      if (path) window.webContents.send('app:open-file', { path })
    } else if (path) {
      router.setPending(path)
    }
  })

  app.on('open-file', (event, path) => {
    event.preventDefault()
    const window = windows?.focusFirst()
    if (window) {
      window.show()
      window.focus()
      window.webContents.send('app:open-file', { path })
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
    if (windows && windows.count() === 0) {
      try {
        windows.create({})
      } catch {
        // The window cap is already enforced; nothing else to do.
      }
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      trayService?.destroy()
      app.quit()
    }
  })

  app.on('before-quit', () => {
    windows?.setQuitting(true)
    if (updateTimer) clearTimeout(updateTimer)
    if (updateInterval) clearInterval(updateInterval)
    void settings?.flush()
    watcher?.closeAll()
    trayService?.destroy()
    logger.info('Quit')
  })
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error.message)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason instanceof Error ? reason.message : String(reason))
})
