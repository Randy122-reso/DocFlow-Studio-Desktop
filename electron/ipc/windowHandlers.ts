import type { Logger } from '../utils/logger'
import type { WindowController } from '../window'
import { registerHandler } from './handle'
import { dirtySchema, titleSchema } from './schemas'

export interface WindowHandlerDeps {
  getController: () => WindowController | null
  logger: Logger
}

export function registerWindowHandlers(deps: WindowHandlerDeps): void {
  const controller = () => {
    const value = deps.getController()
    if (!value || value.window.isDestroyed()) throw new Error('No active window')
    return value
  }

  registerHandler('window:setDirty', dirtySchema, deps.logger, async (state) => {
    controller().setDirty(state)
    return { ok: true }
  })

  registerHandler('window:setTitle', titleSchema, deps.logger, async ({ title }) => {
    controller().window.setTitle(title)
    return { ok: true }
  })

  registerHandler('window:minimize', null, deps.logger, async () => {
    controller().window.minimize()
    return { ok: true }
  })

  registerHandler('window:maximize', null, deps.logger, async () => {
    const win = controller().window
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return { maximized: win.isMaximized() }
  })

  registerHandler('window:isMaximized', null, deps.logger, async () => controller().window.isMaximized())

  registerHandler('window:close', null, deps.logger, async () => {
    controller().window.close()
    return { ok: true }
  })

  registerHandler('window:closeConfirmed', null, deps.logger, async () => {
    controller().confirmClose()
    return { ok: true }
  })

  registerHandler('window:state', null, deps.logger, async () => {
    const win = controller().window
    return {
      bounds: win.getNormalBounds(),
      maximized: win.isMaximized(),
      fullScreen: win.isFullScreen()
    }
  })
}
