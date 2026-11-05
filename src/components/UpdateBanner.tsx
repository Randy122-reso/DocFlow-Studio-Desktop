import { Download, RefreshCw, Rocket, X } from 'lucide-react'
import { useUpdateStore } from '../store/updateStore'
import { useI18n } from '../hooks/useI18n'
import { useUpdate } from '../hooks/useUpdate'

export function UpdateBanner() {
  const update = useUpdateStore((state) => state.update)
  const skippedVersion = useUpdateStore((state) => state.skippedVersion)
  const dismissedVersion = useUpdateStore((state) => state.dismissedVersion)
  const { download, install, cancel, skip, dismiss, check } = useUpdate()
  const { t } = useI18n()

  const version = update.availableVersion
  const hidden =
    !version || version === skippedVersion || version === dismissedVersion
  if (hidden || (update.status !== 'available' && update.status !== 'ready' && update.status !== 'downloading' && update.status !== 'error')) {
    return null
  }

  return (
    <div className={`update-banner ${update.status}`} role="status">
      <span className="update-icon">
        {update.status === 'downloading' ? <Download size={15} /> : <Rocket size={15} />}
      </span>
      <div className="update-copy">
        {update.status === 'available' && <strong>{t('update:available', { version })}</strong>}
        {update.status === 'downloading' && <strong>{t('update:downloading', { progress: update.downloadProgress })}</strong>}
        {update.status === 'ready' && <strong>{t('update:ready', { version })}</strong>}
        {update.status === 'error' && <strong>{t('update:error')}</strong>}
        {update.status === 'downloading' && (
          <span className="update-progress">
            <span style={{ width: `${update.downloadProgress}%` }} />
          </span>
        )}
        {update.error && <span className="update-error">{update.error}</span>}
        {update.releaseNotes && update.status !== 'error' && (
          <span className="update-notes">{update.releaseNotes.split('\n')[0]}</span>
        )}
      </div>
      <div className="update-actions">
        {update.status === 'available' && (
          <button type="button" className="primary-button small" onClick={() => void download()}>
            <Download size={14} /> {t('update:download')}
          </button>
        )}
        {update.status === 'downloading' && (
          <button type="button" className="ghost-button small" onClick={() => void cancel()}>
            {t('cancel')}
          </button>
        )}
        {update.status === 'ready' && (
          <button type="button" className="primary-button small" onClick={() => void install()}>
            <RefreshCw size={14} /> {t('update:restart')}
          </button>
        )}
        {update.status === 'error' && (
          <button type="button" className="ghost-button small" onClick={() => void check()}>
            {t('update:retry')}
          </button>
        )}
        <button type="button" className="ghost-button small" onClick={dismiss}>
          {t('update:later')}
        </button>
        <button type="button" className="ghost-button small" onClick={skip}>
          {t('update:skip')}
        </button>
        <button type="button" className="icon-button" onClick={dismiss} title={t('close')}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
