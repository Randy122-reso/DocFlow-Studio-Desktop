import type { Logger } from '../utils/logger'
import type { SettingsService } from '../services/SettingsService'
import type { AppSettings } from '../types/ipc'
import { AppError } from '../utils/errors'
import { registerHandler } from './handle'
import { settingsGetSchema, settingsSetSchema } from './schemas'

export interface SettingsHandlerDeps {
  service: SettingsService
  logger: Logger
  onChange?: (settings: AppSettings) => void
}

export function registerSettingsHandlers(deps: SettingsHandlerDeps): void {
  registerHandler('settings:all', null, deps.logger, async () => deps.service.all())

  registerHandler('settings:get', settingsGetSchema, deps.logger, async ({ key }) => {
    const all = deps.service.all() as unknown as Record<string, unknown>
    if (!(key in all)) throw new AppError('IPC_INVALID', `Unknown settings key: ${key}`)
    return all[key]
  })

  registerHandler('settings:set', settingsSetSchema, deps.logger, async (patch) => {
    const settings = await deps.service.set(patch)
    deps.onChange?.(settings)
    return settings
  })

  registerHandler('settings:reset', null, deps.logger, async () => {
    const settings = await deps.service.reset()
    deps.onChange?.(settings)
    return settings
  })
}
