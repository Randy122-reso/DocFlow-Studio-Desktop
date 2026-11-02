import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import type { RecentFile } from './types/ipc'

export interface MenuContext {
  isDev: boolean
  getRecent: () => RecentFile[]
  sendAction: (action: string, payload?: unknown) => void
  openRecent: (path: string) => void
  clearRecent: () => void
}

export function buildAppMenu(context: MenuContext): Menu {
  const recent = context.getRecent()
  const recentItems: MenuItemConstructorOptions[] =
    recent.length === 0
      ? [{ label: 'No recent documents', enabled: false }]
      : [
          ...recent.map((file) => ({
            label: file.pinned ? `📌 ${file.displayName}` : file.displayName,
            toolTip: file.path,
            click: () => context.openRecent(file.path)
          })),
          { type: 'separator' as const },
          { label: 'Clear Recent', click: () => context.clearRecent() }
        ]

  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => context.sendAction('new')
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => context.sendAction('open')
        },
        {
          label: 'Open Recent',
          submenu: recentItems
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => context.sendAction('save')
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => context.sendAction('saveAs')
        },
        { type: 'separator' },
        {
          label: 'Export…',
          accelerator: 'CmdOrCtrl+E',
          click: () => context.sendAction('export')
        },
        { type: 'separator' },
        {
          label: 'Reveal in File Explorer',
          click: () => context.sendAction('reveal')
        },
        ...(process.platform === 'darwin'
          ? []
          : [
              { type: 'separator' as const },
              {
                label: 'Exit',
                accelerator: 'Alt+F4',
                click: () => context.sendAction('quit')
              }
            ])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find in Editor',
          accelerator: 'CmdOrCtrl+F',
          click: () => context.sendAction('find')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Table of Contents',
          accelerator: 'CmdOrCtrl+\\',
          click: () => context.sendAction('toggleToc')
        },
        {
          label: 'Zen Review',
          accelerator: 'F11',
          click: () => context.sendAction('zen')
        },
        {
          label: 'Document Settings',
          click: () => context.sendAction('settings')
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        ...(context.isDev
          ? ([
              { type: 'separator' },
              { role: 'reload' },
              { role: 'toggleDevTools' }
            ] as MenuItemConstructorOptions[])
          : [])
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(process.platform === 'darwin' ? [{ role: 'front' as const }] : [])]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => context.sendAction('shortcuts')
        },
        {
          label: 'User Guide',
          click: () => context.sendAction('guide')
        },
        { type: 'separator' },
        {
          label: 'About DocFlow Studio',
          click: () => app.showAboutPanel()
        }
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}

export function applyMenu(context: MenuContext): Menu {
  const menu = buildAppMenu(context)
  Menu.setApplicationMenu(menu)
  return menu
}
