import type { Logger } from '../utils/logger'
import type { TrayService } from '../services/TrayService'
import type { WindowManager } from '../services/WindowManager'
import { registerHandler } from './handle'
import { trayTooltipSchema } from './schemas'

export interface TrayHandlerDeps {
  tray: TrayService
  windows: WindowManager
  logger: Logger
}

export function registerTrayHandlers(deps: TrayHandlerDeps): void {
  registerHandler('tray:show', null, deps.logger, async () => {
    deps.windows.focusFirst()
    return { ok: true }
  })

  registerHandler('tray:hide', null, deps.logger, async () => {
    const focused = deps.windows.getFocused()
    focused?.window.hide()
    return { ok: true }
  })

  registerHandler('tray:setTooltip', trayTooltipSchema, deps.logger, async ({ text }) => {
    deps.tray.setTooltip(text)
    return { ok: true }
  })
}
