import { Languages } from 'lucide-react'
import type { Locale } from '../../electron/types/ipc'
import { useI18n } from '../hooks/useI18n'

export function LanguageSwitcher() {
  const { preference, setLocale, t } = useI18n()

  return (
    <label className="language-switcher" title={t('common.language')}>
      <Languages size={15} />
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        value={preference}
        onChange={(event) => void setLocale(event.target.value as Locale)}
      >
        <option value="auto">{t('common.auto')}</option>
        <option value="en">{t('common.english')}</option>
        <option value="id">{t('common.indonesian')}</option>
      </select>
    </label>
  )
}
