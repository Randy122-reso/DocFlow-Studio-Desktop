import type { Logger } from '../utils/logger'
import type { AppConfig } from '../utils/config'
import type { FileService } from '../services/FileService'
import type { FileWatcherService } from '../services/FileWatcher'
import type { RecentFilesService } from '../services/RecentFilesService'
import type { SettingsService } from '../services/SettingsService'
import type { SessionService } from '../services/SessionService'
import type { DialogService } from '../services/DialogService'
import type { OpenFileRouter } from '../services/OpenFileRouter'
import type { WindowController } from '../window'
import type { RecentFile } from '../types/ipc'
import { registerFileHandlers } from './fileHandlers'
import { registerRecentHandlers } from './recentHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerSessionHandlers } from './sessionHandlers'
import { registerAppHandlers } from './appHandlers'
import { registerWindowHandlers } from './windowHandlers'
import { registerDialogHandlers } from './dialogHandlers'

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
  getWindow: () => Electron.BrowserWindow | null
  getController: () => WindowController | null
  onRecentChanged: (files: RecentFile[]) => void
}

export function registerIpc(deps: IpcDependencies): void {
  registerFileHandlers({
    fileService: deps.fileService,
    watcher: deps.watcher,
    dialogs: deps.dialogs,
    settings: deps.settings,
    config: deps.config,
    logger: deps.logger,
    getWindow: deps.getWindow
  })
  registerRecentHandlers({
    service: deps.recent,
    logger: deps.logger,
    onChange: deps.onRecentChanged
  })
  registerSettingsHandlers({
    service: deps.settings,
    logger: deps.logger
  })
  registerSessionHandlers({
    service: deps.session,
    logger: deps.logger
  })
  registerAppHandlers({
    router: deps.router,
    dialogs: deps.dialogs,
    config: deps.config,
    logger: deps.logger
  })
  registerWindowHandlers({
    getController: deps.getController,
    logger: deps.logger
  })
  registerDialogHandlers({
    dialogs: deps.dialogs,
    logger: deps.logger,
    getWindow: deps.getWindow
  })
}
