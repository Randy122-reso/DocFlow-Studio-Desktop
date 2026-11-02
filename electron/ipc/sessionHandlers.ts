import type { Logger } from '../utils/logger'
import type { SessionService } from '../services/SessionService'
import { registerHandler } from './handle'
import { sessionSaveSchema } from './schemas'

export interface SessionHandlerDeps {
  service: SessionService
  logger: Logger
}

export function registerSessionHandlers(deps: SessionHandlerDeps): void {
  registerHandler('session:save', sessionSaveSchema, deps.logger, async (draft) => {
    await deps.service.write(draft)
    return { ok: true }
  })

  registerHandler('session:load', null, deps.logger, async () => deps.service.read())

  registerHandler('session:clear', null, deps.logger, async () => {
    await deps.service.clear()
    return { ok: true }
  })
}
