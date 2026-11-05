import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Locale } from '../../electron/types/ipc'

export interface I18nHook {
  t: (key: string, options?: Record<string, unknown>) => string
  locale: 'en' | 'id'
  preference: Locale
  setLocale: (locale: Locale) => Promise<void>
}

export function useI18n(): I18nHook {
  const { t, i18n } = useTranslation()
  const [preference, setPreference] = useState<Locale>('auto')

  useEffect(() => {
    let active = true
    const api = window.docflow?.i18n
    if (!api) return
    void api
      .getLocale()
      .then((payload) => {
        if (!active) return
        setPreference(payload.preference)
        if (payload.locale !== i18n.language) void i18n.changeLanguage(payload.locale)
      })
      .catch(() => undefined)
    const unsubscribe = api.onChanged((payload) => {
      setPreference(payload.preference)
      if (payload.locale !== i18n.language) void i18n.changeLanguage(payload.locale)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [i18n])

  const setLocale = useCallback(
    async (locale: Locale) => {
      setPreference(locale)
      try {
        const api = window.docflow?.i18n
        if (api) {
          const payload = await api.setLocale(locale)
          if (payload.locale !== i18n.language) await i18n.changeLanguage(payload.locale)
        }
      } catch {
        // Locale switching is best effort in browser-only test environments.
      }
    },
    [i18n]
  )

  return {
    t: t as I18nHook['t'],
    locale: i18n.resolvedLanguage === 'id' ? 'id' : 'en',
    preference,
    setLocale
  }
}
