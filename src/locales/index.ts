import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './en/common.json'
import enEditor from './en/editor.json'
import enFind from './en/find.json'
import enTabs from './en/tabs.json'
import enUpdate from './en/update.json'
import enTray from './en/tray.json'
import enErrors from './en/errors.json'
import idCommon from './id/common.json'
import idEditor from './id/editor.json'
import idFind from './id/find.json'
import idTabs from './id/tabs.json'
import idUpdate from './id/update.json'
import idTray from './id/tray.json'
import idErrors from './id/errors.json'

export const LOCALE_NAMESPACES = ['common', 'editor', 'find', 'tabs', 'update', 'tray', 'errors'] as const

export function normalizeI18nKey(key: string): string {
  if (!key || key.includes(':')) return key
  const dotIndex = key.indexOf('.')
  if (dotIndex > 0) {
    const ns = key.slice(0, dotIndex)
    const rest = key.slice(dotIndex + 1)
    if ((LOCALE_NAMESPACES as readonly string[]).includes(ns)) {
      return ns === 'common' ? rest : `${ns}:${rest}`
    }
  }
  return key
}

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      editor: enEditor,
      find: enFind,
      tabs: enTabs,
      update: enUpdate,
      tray: enTray,
      errors: enErrors
    },
    id: {
      common: idCommon,
      editor: idEditor,
      find: idFind,
      tabs: idTabs,
      update: idUpdate,
      tray: idTray,
      errors: idErrors
    }
  },
  lng: 'en',
  fallbackLng: 'en',
  ns: [...LOCALE_NAMESPACES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false
})

export default i18n
