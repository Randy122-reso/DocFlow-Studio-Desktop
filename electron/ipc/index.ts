import type { Logger } from '../utils/logger'
import type { AppConfig } from '../utils/config'
import type { FileService } from '../services/FileService'
import type { FileWatcherService } from '../services/FileWatcher'
import type { RecentFilesService } from '../services/RecentFilesService'
import type { SettingsService } from '../services/SettingsService'
import type { SessionService } from '../services/SessionService'
import type { DialogService } from '../services/DialogService'
import type { OpenFileRouter } from '../services/OpenFileRouter'
import type { FileSearchService } from '../services/FileSearchService'
import type { UpdateService } from '../services/UpdateService'
import type { I18nService } from '../services/I18nService'
import type { TrayService } from '../services/TrayService'
import type { WindowManager } from '../services/WindowManager'
import type { ContextMenuService } from '../services/ContextMenuService'
import type { AppSettings, Locale, RecentFile, ResolvedLocale, SessionState } from '../types/ipc'
import { registerFileHandlers } from './fileHandlers'
import { registerRecentHandlers } from './recentHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerSessionHandlers } from './sessionHandlers'
import { registerAppHandlers } from './appHandlers'
import { registerWindowHandlers } from './windowHandlers'
import { registerDialogHandlers } from './dialogHandlers'
import { registerFindHandlers } from './findHandlers'
import { registerUpdateHandlers } from './updateHandlers'
import { registerI18nHandlers } from './i18nHandlers'
import { registerTrayHandlers } from './trayHandlers'

export interface IpcDependencies {
  config: AppConfig
  logger: Logger
  fileService: FileService
  watcher: FileWatcherService
  recent: RecentFilesService
  settings: SettingsService
  session: SessionService
  dialogs: DialogService
  router: OpenFileRouter
  fileSearch: FileSearchService
  updates: UpdateService
  i18n: I18nService
  tray: TrayService
  windows: WindowManager
  contextMenu: ContextMenuService
  getFocusedWindow: () => Electron.BrowserWindow | null
  onRecentChanged: (files: RecentFile[]) => void
  onSessionSaved: (state: SessionState) => void
  onSettingsChanged: (settings: AppSettings) => void
  onLocaleChanged: (locale: Locale, resolved: ResolvedLocale) => void
}

export function registerIpc(deps: IpcDependencies): void {
  registerFileHandlers({
    fileService: deps.fileService,
    watcher: deps.watcher,
    dialogs: deps.dialogs,
    settings: deps.settings,
    config: deps.config,
    logger: deps.logger,
    getWindow: deps.getFocusedWindow
  })
  registerRecentHandlers({
    service: deps.recent,
    logger: deps.logger,
    onChange: deps.onRecentChanged
  })
  registerSettingsHandlers({
    service: deps.settings,
    logger: deps.logger,
    onChange: deps.onSettingsChanged
  })
  registerSessionHandlers({
    service: deps.session,
    logger: deps.logger,
    onSaved: deps.onSessionSaved
  })
  registerAppHandlers({
    router: deps.router,
    dialogs: deps.dialogs,
    contextMenu: deps.contextMenu,
    config: deps.config,
    logger: deps.logger
  })
  registerWindowHandlers({
    manager: deps.windows,
    logger: deps.logger
  })
  registerDialogHandlers({
    dialogs: deps.dialogs,
    logger: deps.logger,
    getWindow: deps.getFocusedWindow
  })
  registerFindHandlers({
    service: deps.fileSearch,
    logger: deps.logger
  })
  registerUpdateHandlers({
    service: deps.updates,
    logger: deps.logger
  })
  registerI18nHandlers({
    service: deps.i18n,
    settings: deps.settings,
    logger: deps.logger,
    onChange: deps.onLocaleChanged
  })
  registerTrayHandlers({
    tray: deps.tray,
    windows: deps.windows,
    logger: deps.logger
  })
}
