import { describe, expect, it } from 'vitest'
import i18n, { LOCALE_NAMESPACES, normalizeI18nKey } from '../../src/locales'
import enCommon from '../../src/locales/en/common.json'
import enEditor from '../../src/locales/en/editor.json'
import enErrors from '../../src/locales/en/errors.json'
import enFind from '../../src/locales/en/find.json'
import enTabs from '../../src/locales/en/tabs.json'
import enTray from '../../src/locales/en/tray.json'
import enUpdate from '../../src/locales/en/update.json'
import idCommon from '../../src/locales/id/common.json'
import idEditor from '../../src/locales/id/editor.json'
import idErrors from '../../src/locales/id/errors.json'
import idFind from '../../src/locales/id/find.json'
import idTabs from '../../src/locales/id/tabs.json'
import idTray from '../../src/locales/id/tray.json'
import idUpdate from '../../src/locales/id/update.json'

const DICTIONARIES = {
  en: {
    common: enCommon,
    editor: enEditor,
    errors: enErrors,
    find: enFind,
    tabs: enTabs,
    tray: enTray,
    update: enUpdate
  },
  id: {
    common: idCommon,
    editor: idEditor,
    errors: idErrors,
    find: idFind,
    tabs: idTabs,
    tray: idTray,
    update: idUpdate
  }
} as const

describe('i18n & Locales', () => {
  it('normalizes legacy namespace.key to standard i18next syntax', () => {
    expect(normalizeI18nKey('common.line')).toBe('line')
    expect(normalizeI18nKey('common.saved')).toBe('saved')
    expect(normalizeI18nKey('editor.formatting')).toBe('editor:formatting')
    expect(normalizeI18nKey('find.findInFiles')).toBe('find:findInFiles')
    expect(normalizeI18nKey('tabs.tabs')).toBe('tabs:tabs')
    expect(normalizeI18nKey('update.checking')).toBe('update:checking')
    expect(normalizeI18nKey('tray.show')).toBe('tray:show')
    expect(normalizeI18nKey('errors.conflict')).toBe('errors:conflict')

    // Standard forms remain untouched
    expect(normalizeI18nKey('line')).toBe('line')
    expect(normalizeI18nKey('editor:formatting')).toBe('editor:formatting')
    expect(normalizeI18nKey('tabs:tabs')).toBe('tabs:tabs')
  })

  it('contains complete 1-to-1 key parity between EN and ID for all namespaces', () => {
    for (const ns of LOCALE_NAMESPACES) {
      const enKeys = Object.keys(DICTIONARIES.en[ns]).sort()
      const idKeys = Object.keys(DICTIONARIES.id[ns]).sort()

      expect(idKeys, `Namespace ${ns} keys mismatch between EN and ID`).toEqual(enKeys)

      for (const key of enKeys) {
        const enVal = (DICTIONARIES.en[ns] as Record<string, string>)[key]
        const idVal = (DICTIONARIES.id[ns] as Record<string, string>)[key]
        expect(enVal.length, `Empty EN string for ${ns}.${key}`).toBeGreaterThan(0)
        expect(idVal.length, `Empty ID string for ${ns}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('translates common keys correctly in both languages', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('line')).toBe('Ln')
    expect(i18n.t('column')).toBe('Col')
    expect(i18n.t('windows')).toBe('windows')
    expect(i18n.t('editor:bold')).toBe('Bold')
    expect(i18n.t('tabs:tabs')).toBe('Tabs')
    expect(i18n.t('find:findInFiles')).toBe('Find in Files')

    await i18n.changeLanguage('id')
    expect(i18n.t('line')).toBe('Ln')
    expect(i18n.t('column')).toBe('Kol')
    expect(i18n.t('windows')).toBe('jendela')
    expect(i18n.t('editor:bold')).toBe('Tebal')
    expect(i18n.t('tabs:tabs')).toBe('Tab')
    expect(i18n.t('find:findInFiles')).toBe('Cari di Berkas')
  })
})
