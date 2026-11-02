import { app } from 'electron'
import type { Logger } from '../utils/logger'
import type { OpenFileRouter } from '../services/OpenFileRouter'
import type { DialogService } from '../services/DialogService'
import type { AppConfig } from '../utils/config'
import { registerHandler } from './handle'
import { externalSchema, folderSchema } from './schemas'

export interface AppHandlerDeps {
  router: OpenFileRouter
  dialogs: DialogService
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
}
