import { useState } from 'react'
import { Check, RefreshCw, RotateCcw, X } from 'lucide-react'
import { useFileStore } from '../store/fileStore'
import { useAppSettingsStore } from '../store/appSettingsStore'
import { useUpdateStore } from '../store/updateStore'
import { useI18n } from '../hooks/useI18n'
import { useUpdate } from '../hooks/useUpdate'
import { DOCUMENT_THEMES } from '../types/document'
import {
  FONT_FAMILY_LABELS,
  FONT_SIZE_LABELS,
  MARGIN_LABELS,
  PAGE_SIZE_LABELS,
  PAPER_TONE_LABELS
} from '../styles/themes'
import type {
  AppSettings,
  FontFamily,
  FontSize,
  Locale,
  MarginSize,
  PageSize,
  PaperTone,
  UpdateChannel
} from '../../electron/types/ipc'

interface DocumentSettingsPanelProps {
  open: boolean
  onClose(): void
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange(value: boolean): void
}) {
  return (
    <label className={`toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="toggle-copy">
        <span className="toggle-label">{label}</span>
        <span className="toggle-description">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
    </label>
  )
}

export function DocumentSettingsPanel({ open, onClose }: DocumentSettingsPanelProps) {
  const settings = useFileStore((state) => state.settings)
  const setSettings = useFileStore((state) => state.setSettings)
  const appSettings = useAppSettingsStore((state) => state.settings)
  const patchSettings = useAppSettingsStore((state) => state.patchSettings)
  const update = useUpdateStore((state) => state.update)
  const { t, preference, setLocale } = useI18n()
  const { check } = useUpdate()
  const [checking, setChecking] = useState(false)

  if (!open) return null

  const patchApp = (patch: Partial<AppSettings>): void => {
    patchSettings(patch)
    void window.docflow.settings.set(patch).catch(() => undefined)
  }

  const handleCheck = async (): Promise<void> => {
    setChecking(true)
    try {
      await check()
    } finally {
      setChecking(false)
    }
  }

  const updateSummary = (): string => {
    if (update.status === 'checking') return t('update.checking')
    if (update.status === 'available' && update.availableVersion) {
      return t('update.available', { version: update.availableVersion })
    }
    if (update.status === 'downloading') {
      return t('update.downloading', { progress: update.downloadProgress })
    }
    if (update.status === 'ready' && update.availableVersion) {
      return t('update.ready', { version: update.availableVersion })
    }
    if (update.status === 'error') return t('update.error')
    if (update.lastCheckedAt) return t('update.upToDate')
    return t('update.notAvailable')
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div
        className="modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('common.documentSettings')}
      >
        <header className="modal-head">
          <div>
            <h2>{t('common.documentSettings')}</h2>
            <p>{t('common.settingsSubtitle')}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title={t('common.close')}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body settings-body">
          <section className="settings-section">
            <h3>{t('common.themeSection')}</h3>
            <div className="theme-grid">
              {DOCUMENT_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-card ${settings.theme === theme.id ? 'active' : ''}`}
                  onClick={() => setSettings({ theme: theme.id })}
                >
                  <span className="theme-swatch" style={{ background: theme.accent }} />
                  <span className="theme-card-copy">
                    <strong>{theme.name}</strong>
                    <span>{theme.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('common.typographySection')}</h3>
            <div className="settings-grid">
              <label className="field">
                <span>{t('editor.fontSize')}</span>
                <select
                  value={settings.fontSize}
                  onChange={(event) => setSettings({ fontSize: event.target.value as FontSize })}
                >
                  {Object.entries(FONT_SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('editor.fontFamily')}</span>
                <select
                  value={settings.fontFamily}
                  onChange={(event) => setSettings({ fontFamily: event.target.value as FontFamily })}
                >
                  {Object.entries(FONT_FAMILY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('common.pageSection')}</h3>
            <div className="settings-grid">
              <label className="field">
                <span>{t('editor.pageSize')}</span>
                <select
                  value={settings.pageSize}
                  onChange={(event) => setSettings({ pageSize: event.target.value as PageSize })}
                >
                  {Object.entries(PAGE_SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('editor.margins')}</span>
                <select
                  value={settings.marginSize}
                  onChange={(event) => setSettings({ marginSize: event.target.value as MarginSize })}
                >
                  {Object.entries(MARGIN_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('editor.paperTone')}</span>
                <select
                  value={settings.paperTone}
                  onChange={(event) => setSettings({ paperTone: event.target.value as PaperTone })}
                >
                  {Object.entries(PAPER_TONE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('common.optionsSection')}</h3>
            <div className="toggle-list">
              <Toggle
                label={t('common.headerFooter')}
                description={t('common.headerFooterDetail')}
                checked={settings.showHeaderFooter}
                onChange={(value) => setSettings({ showHeaderFooter: value })}
              />
              <Toggle
                label={t('common.pageNumbers')}
                description={t('common.pageNumbersDetail')}
                checked={settings.showPageNumbers}
                onChange={(value) => setSettings({ showPageNumbers: value })}
              />
              <Toggle
                label={t('common.numberHeadings')}
                description={t('common.numberHeadingsDetail')}
                checked={settings.autoNumberHeadings}
                onChange={(value) => setSettings({ autoNumberHeadings: value })}
              />
              <Toggle
                label={t('common.justifyText')}
                description={t('common.justifyTextDetail')}
                checked={settings.justifyText}
                onChange={(value) => setSettings({ justifyText: value })}
              />
            </div>
          </section>

          {appSettings && (
            <>
              <section className="settings-section">
                <h3>{t('common.applicationSection')}</h3>
                <p className="settings-hint">{t('common.applicationDetail')}</p>
                <div className="settings-grid">
                  <label className="field">
                    <span>{t('common.language')}</span>
                    <select
                      value={preference}
                      onChange={(event) => void setLocale(event.target.value as Locale)}
                    >
                      <option value="auto">{t('common.auto')}</option>
                      <option value="en">{t('common.english')}</option>
                      <option value="id">{t('common.indonesian')}</option>
                    </select>
                    <small>{t('common.languageHint')}</small>
                  </label>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('common.updatesSection')}</h3>
                <p className="settings-hint">{t('common.updatesDetail')}</p>
                <div className="settings-grid">
                  <label className="field">
                    <span>{t('update.channel')}</span>
                    <select
                      value={appSettings.updateChannel}
                      onChange={(event) => patchApp({ updateChannel: event.target.value as UpdateChannel })}
                    >
                      <option value="stable">{t('update.stable')}</option>
                      <option value="beta">{t('update.beta')}</option>
                    </select>
                  </label>
                </div>
                <div className="toggle-list">
                  <Toggle
                    label={t('update.autoCheck')}
                    description={t('common.updatesDetail')}
                    checked={appSettings.autoCheckUpdates}
                    onChange={(value) => patchApp({ autoCheckUpdates: value })}
                  />
                </div>
                <div className="settings-inline">
                  <button
                    type="button"
                    className="ghost-button small"
                    onClick={() => void handleCheck()}
                    disabled={checking || update.status === 'checking'}
                  >
                    <RefreshCw size={14} className={checking || update.status === 'checking' ? 'spin' : ''} />
                    {t('common.checkUpdates')}
                  </button>
                  <span className={`settings-status ${update.status}`} role="status">
                    {updateSummary()}
                  </span>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('common.traySection')}</h3>
                <p className="settings-hint">{t('common.trayDetail')}</p>
                <div className="toggle-list">
                  <Toggle
                    label={t('tray.enabled')}
                    description={t('common.trayDetail')}
                    checked={appSettings.tray.enabled}
                    onChange={(value) => patchApp({ tray: { ...appSettings.tray, enabled: value } })}
                  />
                  <Toggle
                    label={t('tray.minimizeOnClose')}
                    description={t('common.trayDetail')}
                    checked={appSettings.tray.minimizeOnClose}
                    disabled={!appSettings.tray.enabled}
                    onChange={(value) => patchApp({ tray: { ...appSettings.tray, minimizeOnClose: value } })}
                  />
                  <Toggle
                    label={t('tray.startMinimized')}
                    description={t('common.trayDetail')}
                    checked={appSettings.tray.startMinimized}
                    disabled={!appSettings.tray.enabled}
                    onChange={(value) => patchApp({ tray: { ...appSettings.tray, startMinimized: value } })}
                  />
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="modal-foot">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setSettings({
              theme: 'modern',
              fontSize: 'md',
              fontFamily: 'sans',
              pageSize: 'A4',
              marginSize: 'normal',
              paperTone: 'white',
              showHeaderFooter: true,
              showPageNumbers: true,
              autoNumberHeadings: false,
              justifyText: false
            })}
          >
            <RotateCcw size={14} /> {t('common.resetDefaults')}
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            <Check size={15} /> {t('common.done')}
          </button>
        </footer>
      </div>
    </div>
  )
}
