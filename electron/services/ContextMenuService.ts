import { Menu, BrowserWindow, type MenuItemConstructorOptions } from 'electron'

export type ContextType = 'editor' | 'preview'

export class ContextMenuService {
  constructor(private readonly window: BrowserWindow | null) {}

  show(type: ContextType, x?: number, y?: number): void {
    const isEditor = type === 'editor'
    const template: MenuItemConstructorOptions[] = [
      { label: 'Cut', role: 'cut', enabled: isEditor },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste', enabled: isEditor },
      { type: 'separator' },
      { label: 'Select All', role: 'selectAll' }
    ]
    const menu = Menu.buildFromTemplate(template)
    if (this.window) {
      menu.popup({ window: this.window, x, y })
    } else {
      menu.popup({ x, y })
    }
  }
}
