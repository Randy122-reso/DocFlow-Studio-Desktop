import { Languages } from 'lucide-react'
import type { Locale } from '../../electron/types/ipc'
import { useI18n } from '../hooks/useI18n'

export function LanguageSwitcher() {
  const { preference, setLocale, t } = useI18n()

  return (
    <label className="language-switcher" title={t('language')}>
      <Languages size={15} />
      <span className="sr-only">{t('language')}</span>
      <select
        aria-label={t('language')}
        value={preference}
        onChange={(event) => void setLocale(event.target.value as Locale)}
      >
        <option value="auto">{t('auto')}</option>
        <option value="en">{t('english')}</option>
        <option value="id">{t('indonesian')}</option>
      </select>
    </label>
  )
}
