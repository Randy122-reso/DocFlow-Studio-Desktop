import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron'
import type { I18nService } from './I18nService'
import type { RecentFile } from '../types/ipc'

export interface TrayCallbacks {
  showWindow(): void
  hideWindow(): void
  newTab(): void
  openRecent(path: string): void
  getRecent(): RecentFile[]
  checkForUpdates(): void
  quit(): void
}

export class TrayService {
  private tray: Tray | null = null
  private readonly iconPath: string
  private readonly i18n: I18nService
  private readonly callbacks: TrayCallbacks
  private updateAvailable = false

  constructor(options: { iconPath: string; i18n: I18nService; callbacks: TrayCallbacks }) {
    this.iconPath = options.iconPath
    this.i18n = options.i18n
    this.callbacks = options.callbacks
  }

  create(): void {
    if (this.tray) return
    const image = nativeImage.createFromPath(this.iconPath).resize({ width: 16, height: 16 })
    if (image.isEmpty()) return
    this.tray = new Tray(image)
    this.tray.on('click', () => this.callbacks.showWindow())
    this.rebuild()
  }

  setEnabled(enabled: boolean): void {
    if (enabled) this.create()
    else this.destroy()
  }

  setUpdateAvailable(available: boolean): void {
    this.updateAvailable = available
    if (this.tray) {
      this.tray.setToolTip(
        available ? this.i18n.t('tray.updateAvailable') : this.i18n.t('tray.tooltip')
      )
      this.rebuild()
    }
  }

  rebuild(): void {
    if (!this.tray) return
    const recent = this.callbacks.getRecent()
    const recentItems: MenuItemConstructorOptions[] =
      recent.length === 0
        ? [{ label: this.i18n.t('menu.noRecent'), enabled: false }]
        : recent.map((file) => ({
            label: file.pinned ? `📌 ${file.displayName}` : file.displayName,
            toolTip: file.path,
            click: () => this.callbacks.openRecent(file.path)
          }))
    const template: MenuItemConstructorOptions[] = [
      { label: this.i18n.t('tray.show'), click: () => this.callbacks.showWindow() },
      { label: this.i18n.t('tray.hide'), click: () => this.callbacks.hideWindow() },
      { type: 'separator' },
      { label: this.i18n.t('tray.newTab'), click: () => this.callbacks.newTab() },
      { label: this.i18n.t('tray.recent'), submenu: recentItems },
      { type: 'separator' },
      {
        label: this.updateAvailable
          ? this.i18n.t('update.available', { version: '…' })
          : this.i18n.t('tray.checkUpdates'),
        click: () => this.callbacks.checkForUpdates()
      },
      { type: 'separator' },
      { label: this.i18n.t('tray.quit'), click: () => this.callbacks.quit() }
    ]
    this.tray.setToolTip(
      this.updateAvailable ? this.i18n.t('tray.updateAvailable') : this.i18n.t('tray.tooltip')
    )
    this.tray.setContextMenu(Menu.buildFromTemplate(template))
  }

  setTooltip(text: string): void {
    this.tray?.setToolTip(text)
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
