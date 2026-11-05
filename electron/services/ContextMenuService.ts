import { BrowserWindow, Menu, clipboard, shell, type MenuItemConstructorOptions } from 'electron'
import type { ContextMenuRequest } from '../types/ipc'
import type { I18nService } from './I18nService'

export interface ContextMenuCallbacks {
  onTabAction: (action: string, tabId: string) => void
}

export class ContextMenuService {
  private readonly i18n: I18nService
  private readonly callbacks: ContextMenuCallbacks

  constructor(options: { i18n: I18nService; callbacks: ContextMenuCallbacks }) {
    this.i18n = options.i18n
    this.callbacks = options.callbacks
  }

  buildTemplate(request: ContextMenuRequest): MenuItemConstructorOptions[] {
    const t = (key: string) => this.i18n.t(key)
    if (request.type === 'editor') {
      return [
        { label: t('context.cut'), role: 'cut', enabled: Boolean(request.isEditable && request.hasSelection) },
        { label: t('context.copy'), role: 'copy', enabled: Boolean(request.hasSelection) },
        { label: t('context.paste'), role: 'paste', enabled: Boolean(request.isEditable) },
        { type: 'separator' },
        { label: t('context.selectAll'), role: 'selectAll' }
      ]
    }
    if (request.type === 'preview') {
      return [
        { label: t('context.copy'), role: 'copy' },
        { label: t('context.selectAll'), role: 'selectAll' }
      ]
    }

    const tabId = request.tabId ?? ''
    const pinned = Boolean(request.isPinned)
    return [
      { label: t('menu.closeTab'), click: () => this.callbacks.onTabAction('close', tabId) },
      { label: t('menu.closeOthers'), click: () => this.callbacks.onTabAction('closeOthers', tabId) },
      { label: t('menu.closeRight'), click: () => this.callbacks.onTabAction('closeRight', tabId) },
      { label: t('menu.closeLeft'), click: () => this.callbacks.onTabAction('closeLeft', tabId) },
      { type: 'separator' },
      {
        label: pinned ? t('menu.unpin') : t('menu.pin'),
        click: () => this.callbacks.onTabAction('togglePin', tabId)
      },
      { type: 'separator' },
      {
        label: t('menu.copyPath'),
        enabled: Boolean(request.filePath),
        click: () => {
          if (request.filePath) clipboard.writeText(request.filePath)
        }
      },
      {
        label: t('menu.reveal'),
        enabled: Boolean(request.filePath),
        click: () => {
          if (request.filePath) shell.showItemInFolder(request.filePath)
        }
      },
      { type: 'separator' },
      { label: t('menu.moveNewWindow'), click: () => this.callbacks.onTabAction('detach', tabId) }
    ]
  }

  show(request: ContextMenuRequest, window: BrowserWindow | null): void {
    const menu = Menu.buildFromTemplate(this.buildTemplate(request))
    if (window && !window.isDestroyed()) menu.popup({ window })
    else menu.popup()
  }
}
