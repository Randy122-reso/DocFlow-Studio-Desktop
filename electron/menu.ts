import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import type { I18nService } from './services/I18nService'
import type { Locale, RecentFile } from './types/ipc'

export interface MenuContext {
  isDev: boolean
  i18n: I18nService
  getRecent: () => RecentFile[]
  sendAction: (action: string, payload?: unknown) => void
  openRecent: (path: string) => void
  clearRecent: () => void
  setLocale: (locale: Locale) => void
  checkForUpdates: () => void
  newWindow: () => void
  quit: () => void
}

export function buildAppMenu(context: MenuContext): Menu {
  const t = (key: string, vars?: Record<string, string | number>) => context.i18n.t(key, vars)
  const recent = context.getRecent()
  const recentItems: MenuItemConstructorOptions[] =
    recent.length === 0
      ? [{ label: t('menu.noRecent'), enabled: false }]
      : [
          ...recent.map((file) => ({
            label: file.pinned ? `📌 ${file.displayName}` : file.displayName,
            toolTip: file.path,
            click: () => context.openRecent(file.path)
          })),
          { type: 'separator' as const },
          { label: t('menu.clearRecent'), click: () => context.clearRecent() }
        ]

  const locale = context.i18n.getLocale()
  const languageItems: MenuItemConstructorOptions[] = [
    { label: t('menu.languageAuto'), type: 'radio', checked: locale === 'auto', click: () => context.setLocale('auto') },
    { label: t('menu.languageEn'), type: 'radio', checked: locale === 'en', click: () => context.setLocale('en') },
    { label: t('menu.languageId'), type: 'radio', checked: locale === 'id', click: () => context.setLocale('id') }
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
      label: t('menu.file'),
      submenu: [
        { label: t('menu.newTab'), accelerator: 'CmdOrCtrl+N', click: () => context.sendAction('newTab') },
        { label: t('menu.newWindow'), accelerator: 'CmdOrCtrl+Shift+N', click: () => context.newWindow() },
        { label: t('menu.open'), accelerator: 'CmdOrCtrl+O', click: () => context.sendAction('open') },
        { label: t('menu.openRecent'), submenu: recentItems },
        { type: 'separator' },
        { label: t('menu.save'), accelerator: 'CmdOrCtrl+S', click: () => context.sendAction('save') },
        { label: t('menu.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => context.sendAction('saveAs') },
        { type: 'separator' },
        { label: t('menu.export'), accelerator: 'CmdOrCtrl+E', click: () => context.sendAction('export') },
        { type: 'separator' },
        { label: t('menu.closeTab'), accelerator: 'CmdOrCtrl+W', click: () => context.sendAction('closeTab') },
        { label: t('menu.reveal'), click: () => context.sendAction('reveal') },
        ...(process.platform === 'darwin'
          ? []
          : [
              { type: 'separator' as const },
              { label: t('menu.exit'), accelerator: 'Alt+F4', click: () => context.quit() }
            ])
      ]
    },
    {
      label: t('menu.edit'),
      submenu: [
        { label: t('menu.undo'), role: 'undo' },
        { label: t('menu.redo'), role: 'redo' },
        { type: 'separator' },
        { label: t('menu.cut'), role: 'cut' },
        { label: t('menu.copy'), role: 'copy' },
        { label: t('menu.paste'), role: 'paste' },
        { label: t('menu.selectAll'), role: 'selectAll' },
        { type: 'separator' },
        { label: t('menu.find'), accelerator: 'CmdOrCtrl+F', click: () => context.sendAction('find') },
        {
          label: t('menu.findInFiles'),
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => context.sendAction('findInFiles')
        },
        { label: t('menu.replace'), accelerator: 'CmdOrCtrl+H', click: () => context.sendAction('replace') }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        {
          label: t('menu.toggleToc'),
          accelerator: 'CmdOrCtrl+\\',
          click: () => context.sendAction('toggleToc')
        },
        { label: t('menu.zen'), accelerator: 'F11', click: () => context.sendAction('zen') },
        { label: t('menu.settings'), click: () => context.sendAction('settings') },
        { type: 'separator' },
        { label: t('menu.language'), submenu: languageItems },
        { type: 'separator' },
        { label: t('menu.resetZoom'), role: 'resetZoom' },
        { label: t('menu.zoomIn'), role: 'zoomIn' },
        { label: t('menu.zoomOut'), role: 'zoomOut' },
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
      label: t('menu.window'),
      submenu: [
        { label: t('menu.newWindow'), click: () => context.newWindow() },
        { type: 'separator' },
        { label: t('menu.minimize'), role: 'minimize' },
        ...(process.platform === 'darwin' ? [{ role: 'front' as const }] : [])
      ]
    },
    {
      label: t('menu.help'),
      submenu: [
        { label: t('menu.shortcuts'), accelerator: 'CmdOrCtrl+/', click: () => context.sendAction('shortcuts') },
        { label: t('menu.userGuide'), click: () => context.sendAction('guide') },
        { type: 'separator' },
        { label: t('menu.checkUpdates'), click: () => context.checkForUpdates() },
        { type: 'separator' },
        { label: t('menu.about'), click: () => app.showAboutPanel() }
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
