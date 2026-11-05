import type { Logger } from '../utils/logger'
import type { I18nService } from '../services/I18nService'
import type { SettingsService } from '../services/SettingsService'
import type { Locale, ResolvedLocale } from '../types/ipc'
import { registerHandler } from './handle'
import { localeSchema } from './schemas'

export interface I18nHandlerDeps {
  service: I18nService
  settings: SettingsService
  logger: Logger
  onChange?: (locale: Locale, resolved: ResolvedLocale) => void
}

export function registerI18nHandlers(deps: I18nHandlerDeps): void {
  registerHandler('i18n:getLocale', null, deps.logger, async () => ({
    preference: deps.service.getLocale(),
    locale: deps.service.getResolvedLocale()
  }))

  registerHandler('i18n:setLocale', localeSchema, deps.logger, async ({ locale }) => {
    const resolved = deps.service.setLocale(locale)
    await deps.settings.set({ locale })
    deps.onChange?.(locale, resolved)
    return { preference: locale, locale: resolved }
  })
}
