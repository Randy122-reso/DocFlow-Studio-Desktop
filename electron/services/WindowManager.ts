import { randomUUID } from 'node:crypto'
import type { BrowserWindow } from 'electron'
import { app } from 'electron'
import type { SessionState, TabSnapshot, WindowBounds, WindowInfo } from '../types/ipc'
import type { SettingsService } from './SettingsService'
import type { SessionService } from './SessionService'
import type { I18nService } from './I18nService'
import type { Logger } from '../utils/logger'
import { createMainWindow, type WindowController } from '../window'

export interface WindowManagerOptions {
  preloadPath: string
  settings: SettingsService
  session: SessionService
  i18n: I18nService
  logger: Logger
  isDev: boolean
  devToolsEnabled: boolean
  maxWindows: number
  onTabDetached?: (tab: TabSnapshot, newWindowId: string) => void
}

export class WindowManager {
  private readonly options: WindowManagerOptions
  private readonly controllers = new Map<string, WindowController>()
  private quitting = false

  constructor(options: WindowManagerOptions) {
    this.options = options
  }

  count(): number {
    return this.controllers.size
  }

  all(): WindowController[] {
    return [...this.controllers.values()].filter((controller) => !controller.window.isDestroyed())
  }

  get(id: string | null): WindowController | null {
    if (!id) return null
    const controller = this.controllers.get(id)
    if (!controller || controller.window.isDestroyed()) return null
    return controller
  }

  getFocused(): WindowController | null {
    const focused = this.all().find((controller) => controller.window.isFocused())
    return focused ?? this.all()[0] ?? null
  }

  findByWebContents(webContents: Electron.WebContents): WindowController | null {
    return (
      this.all().find((controller) => controller.window.webContents.id === webContents.id) ?? null
    )
  }

  restore(state: SessionState | null): void {
    const windows = (state?.windows ?? []).slice(0, this.options.maxWindows)
    if (windows.length === 0) {
      this.create({})
      return
    }
    for (const windowState of windows) {
      this.create({
        id: windowState.id,
        tabs: windowState.tabs,
        activeTabId: windowState.activeTabId,
        bounds: windowState.bounds,
        visible: windowState.id === state?.activeWindowId
      })
    }
    const active = this.get(state?.activeWindowId ?? null)
    active?.window.show()
    active?.window.focus()
  }

  create(options: {
    id?: string
    tabs?: TabSnapshot[]
    activeTabId?: string | null
    bounds?: WindowBounds
    visible?: boolean
  } = {}): WindowController | null {
    if (this.controllers.size >= this.options.maxWindows) {
      throw new Error(`MAX_WINDOWS: at most ${this.options.maxWindows} windows are allowed`)
    }
    const id = options.id ?? randomUUID()
    if (this.controllers.has(id)) {
      throw new Error(`WINDOW_EXISTS: window ${id} is already registered`)
    }
    const controller = createMainWindow({
      id,
      preloadPath: this.options.preloadPath,
      settings: this.options.settings,
      i18n: this.options.i18n,
      isDev: this.options.isDev,
      devToolsEnabled: this.options.devToolsEnabled,
      initialTabs: options.tabs ?? [],
      initialActiveTabId: options.activeTabId ?? null,
      initialBounds: options.bounds,
      visible: options.visible,
      shouldMinimizeToTray: () => {
        const tray = this.options.settings.get('tray')
        return tray.enabled && tray.minimizeOnClose
      },
      isQuitting: () => this.quitting,
      onBoundsChanged: (windowId, bounds) => {
        const target = this.get(windowId)
        target?.window.webContents.send('window:bounds-changed', { bounds })
      },
      onClosed: (windowId) => {
        this.controllers.delete(windowId)
        // Keep the last window in the session so quitting restores it. A
        // window in a multi-window session is removed immediately.
        if (!this.quitting && this.controllers.size > 0) {
          void this.options.session.removeWindow(windowId).catch(() => undefined)
        }
      }
    })
    this.controllers.set(id, controller)
    this.options.logger.info('Window created', { id })
    return controller
  }

  detachTab(sourceWindowId: string, tab: TabSnapshot): WindowController | null {
    const source = this.get(sourceWindowId)
    if (!source) return null
    const created = this.create({ tabs: [tab], activeTabId: tab.id })
    if (created) {
      this.options.onTabDetached?.(tab, created.id)
      created.window.show()
      created.window.focus()
    }
    return created
  }

  close(id: string): void {
    this.get(id)?.window.close()
  }

  closeAll(): void {
    for (const controller of this.all()) {
      controller.confirmClose()
    }
  }

  setQuitting(value: boolean): void {
    this.quitting = value
  }

  isQuitting(): boolean {
    return this.quitting
  }

  broadcast(channel: string, payload: unknown): void {
    for (const controller of this.all()) {
      if (!controller.window.webContents.isDestroyed()) {
        controller.window.webContents.send(channel, payload)
      }
    }
  }

  infoFor(webContents: Electron.WebContents): WindowInfo | null {
    const controller = this.findByWebContents(webContents)
    return controller?.info() ?? null
  }

  focusFirst(): BrowserWindow | null {
    const controller = this.getFocused()
    if (!controller) return null
    if (controller.window.isMinimized()) controller.window.restore()
    controller.window.show()
    controller.window.focus()
    return controller.window
  }

  quit(): void {
    this.quitting = true
    app.quit()
  }
}
