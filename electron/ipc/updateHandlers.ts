import type { Logger } from '../utils/logger'
import type { UpdateService } from '../services/UpdateService'
import { registerHandler } from './handle'

export interface UpdateHandlerDeps {
  service: UpdateService
  logger: Logger
}

export function registerUpdateHandlers(deps: UpdateHandlerDeps): void {
  registerHandler('update:status', null, deps.logger, async () => deps.service.getState())
  registerHandler('update:check', null, deps.logger, async () => deps.service.checkForUpdates())
  registerHandler('update:download', null, deps.logger, async () => deps.service.download())
  registerHandler('update:install', null, deps.logger, async () => {
    deps.service.install()
    return { ok: true }
  })
  registerHandler('update:cancel', null, deps.logger, async () => deps.service.cancel())
}
