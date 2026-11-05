import { describe, expect, it } from 'vitest'
import { I18nService } from '../../electron/services/I18nService'

describe('I18nService', () => {
  it('resolves explicit locales', () => {
    const en = new I18nService({ locale: 'en', systemLocale: 'id-ID' })
    const id = new I18nService({ locale: 'id', systemLocale: 'en-US' })
    expect(en.getResolvedLocale()).toBe('en')
    expect(id.getResolvedLocale()).toBe('id')
  })

  it('follows the system locale in automatic mode with an English fallback', () => {
    expect(new I18nService({ locale: 'auto', systemLocale: 'id-ID' }).getResolvedLocale()).toBe('id')
    expect(new I18nService({ locale: 'auto', systemLocale: 'fr-FR' }).getResolvedLocale()).toBe('en')
  })

  it('translates native menu and tray labels for both languages', () => {
    const en = new I18nService({ locale: 'en', systemLocale: 'en-US' })
    const id = new I18nService({ locale: 'id', systemLocale: 'en-US' })
    expect(en.t('menu.file')).toBe('File')
    expect(id.t('menu.file')).toBe('Berkas')
    expect(en.t('tray.quit')).toBe('Quit DocFlow Studio')
    expect(id.t('tray.quit')).toBe('Keluar dari DocFlow Studio')
  })

  it('interpolates variables', () => {
    const id = new I18nService({ locale: 'id', systemLocale: 'en-US' })
    expect(id.t('update.downloading', { progress: 42 })).toContain('42%')
    expect(id.t('dialog.unsavedMessage', { name: 'catatan.md' })).toContain('catatan.md')
  })

  it('falls back to English when an ID key is missing', () => {
    const service = new I18nService({
      locale: 'id',
      systemLocale: 'id-ID',
      dictionaries: {
        en: { 'menu.file': 'File', 'only.en': 'English only' },
        id: { 'menu.file': 'Berkas' }
      }
    })
    expect(service.t('only.en')).toBe('English only')
    expect(service.t('missing.key')).toBe('missing.key')
  })

  it('switches locale at runtime', () => {
    const service = new I18nService({ locale: 'en', systemLocale: 'en-US' })
    expect(service.t('menu.save')).toBe('Save')
    service.setLocale('id')
    expect(service.getLocale()).toBe('id')
    expect(service.t('menu.save')).toBe('Simpan')
    service.setLocale('auto')
    expect(service.getResolvedLocale()).toBe('en')
  })
})
