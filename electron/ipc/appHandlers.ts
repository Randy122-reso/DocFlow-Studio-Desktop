import { app, BrowserWindow } from 'electron'
import type { Logger } from '../utils/logger'
import type { OpenFileRouter } from '../services/OpenFileRouter'
import type { DialogService } from '../services/DialogService'
import type { ContextMenuService } from '../services/ContextMenuService'
import type { AppConfig } from '../utils/config'
import type { ContextMenuRequest } from '../types/ipc'
import { registerHandler } from './handle'
import { contextMenuSchema, externalSchema, folderSchema } from './schemas'

export interface AppHandlerDeps {
  router: OpenFileRouter
  dialogs: DialogService
  contextMenu: ContextMenuService
  config: AppConfig
  logger: Logger
}

export function registerAppHandlers(deps: AppHandlerDeps): void {
  registerHandler('app:version', null, deps.logger, async () => app.getVersion())

  registerHandler('app:platform', null, deps.logger, async () => process.platform)

  registerHandler('app:consumeLaunchFile', null, deps.logger, async () => {
    const path = deps.router.consume()
    return path ? { path } : null
  })

  registerHandler('app:openExternal', externalSchema, deps.logger, async ({ url }) => {
    deps.dialogs.openExternal(url, deps.config.allowedExternal)
    return { ok: true }
  })

  registerHandler('app:showItemInFolder', folderSchema, deps.logger, async ({ path }) => {
    deps.dialogs.showItemInFolder(path)
    return { ok: true }
  })

  registerHandler('app:quit', null, deps.logger, async () => {
    app.quit()
    return { ok: true }
  })

  registerHandler('app:showContextMenu', contextMenuSchema, deps.logger, async (payload, event) => {
    const request = payload as ContextMenuRequest
    const win = BrowserWindow.fromWebContents(event.sender)
    deps.contextMenu.show(request, win)
    return { ok: true }
  })
}
