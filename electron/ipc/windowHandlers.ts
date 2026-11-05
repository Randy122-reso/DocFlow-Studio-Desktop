import type { Logger } from '../utils/logger'
import type { WindowManager } from '../services/WindowManager'
import { registerHandler } from './handle'
import { detachTabSchema, dirtySchema, titleSchema } from './schemas'

export interface WindowHandlerDeps {
  manager: WindowManager
  logger: Logger
}

export function registerWindowHandlers(deps: WindowHandlerDeps): void {
  const controllerFor = (event: Electron.IpcMainInvokeEvent) => {
    const controller = deps.manager.findByWebContents(event.sender) ?? deps.manager.getFocused()
    if (!controller || controller.window.isDestroyed()) throw new Error('No active window')
    return controller
  }

  registerHandler('window:setDirty', dirtySchema, deps.logger, async (state, event) => {
    controllerFor(event).setDirty(state)
    return { ok: true }
  })

  registerHandler('window:setTitle', titleSchema, deps.logger, async ({ title }, event) => {
    controllerFor(event).window.setTitle(title)
    return { ok: true }
  })

  registerHandler('window:minimize', null, deps.logger, async (_input, event) => {
    controllerFor(event).window.minimize()
    return { ok: true }
  })

  registerHandler('window:maximize', null, deps.logger, async (_input, event) => {
    const win = controllerFor(event).window
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return { maximized: win.isMaximized() }
  })

  registerHandler('window:isMaximized', null, deps.logger, async (_input, event) =>
    controllerFor(event).window.isMaximized()
  )

  registerHandler('window:close', null, deps.logger, async (_input, event) => {
    controllerFor(event).window.close()
    return { ok: true }
  })

  registerHandler('window:closeConfirmed', null, deps.logger, async (_input, event) => {
    controllerFor(event).confirmClose()
    return { ok: true }
  })

  registerHandler('window:state', null, deps.logger, async (_input, event) => {
    const win = controllerFor(event).window
    return {
      bounds: win.getNormalBounds(),
      maximized: win.isMaximized(),
      fullScreen: win.isFullScreen()
    }
  })

  registerHandler('window:info', null, deps.logger, async (_input, event) => {
    const info = deps.manager.infoFor(event.sender)
    if (!info) throw new Error('WINDOW_NOT_FOUND')
    return info
  })

  registerHandler('window:count', null, deps.logger, async () => deps.manager.count())

  registerHandler('window:newWindow', null, deps.logger, async () => {
    const controller = deps.manager.create({})
    if (!controller) throw new Error('MAX_WINDOWS')
    controller.window.show()
    controller.window.focus()
    return { ok: true, id: controller.id }
  })

  registerHandler('window:detachTab', detachTabSchema, deps.logger, async ({ tab, sourceWindowId }) => {
    const source = deps.manager.get(sourceWindowId) ?? deps.manager.getFocused()
    if (!source) throw new Error('WINDOW_NOT_FOUND')
    const created = deps.manager.detachTab(source.id, tab)
    if (!created) throw new Error('MAX_WINDOWS')
    return { ok: true, id: created.id }
  })
}
