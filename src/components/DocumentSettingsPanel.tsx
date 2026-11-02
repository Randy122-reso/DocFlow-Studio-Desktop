import { X, RotateCcw } from 'lucide-react'
import { useFileStore } from '../store/fileStore'
import { DOCUMENT_THEMES } from '../types/document'
import {
  FONT_FAMILY_LABELS,
  FONT_SIZE_LABELS,
  MARGIN_LABELS,
  PAGE_SIZE_LABELS,
  PAPER_TONE_LABELS
} from '../styles/themes'
import type { FontFamily, FontSize, MarginSize, PageSize, PaperTone } from '../../electron/types/ipc'

interface DocumentSettingsPanelProps {
  open: boolean
  onClose(): void
}

function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange(value: boolean): void
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-copy">
        <span className="toggle-label">{label}</span>
        <span className="toggle-description">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
    </label>
  )
}

export function DocumentSettingsPanel({ open, onClose }: DocumentSettingsPanelProps) {
  const settings = useFileStore((state) => state.settings)
  const setSettings = useFileStore((state) => state.setSettings)

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal settings-modal" role="dialog" aria-modal="true" aria-label="Document settings">
        <header className="modal-head">
          <div>
            <h2>Document settings</h2>
            <p>Typography, page and export defaults.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body settings-body">
          <section className="settings-section">
            <h3>Theme</h3>
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
            <h3>Typography</h3>
            <div className="settings-grid">
              <label className="field">
                <span>Font size</span>
                <select value={settings.fontSize} onChange={(event) => setSettings({ fontSize: event.target.value as FontSize })}>
                  {Object.entries(FONT_SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Font family</span>
                <select value={settings.fontFamily} onChange={(event) => setSettings({ fontFamily: event.target.value as FontFamily })}>
                  {Object.entries(FONT_FAMILY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Page</h3>
            <div className="settings-grid">
              <label className="field">
                <span>Page size</span>
                <select value={settings.pageSize} onChange={(event) => setSettings({ pageSize: event.target.value as PageSize })}>
                  {Object.entries(PAGE_SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Margins</span>
                <select value={settings.marginSize} onChange={(event) => setSettings({ marginSize: event.target.value as MarginSize })}>
                  {Object.entries(MARGIN_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Paper tone</span>
                <select value={settings.paperTone} onChange={(event) => setSettings({ paperTone: event.target.value as PaperTone })}>
                  {Object.entries(PAPER_TONE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>Options</h3>
            <div className="toggle-list">
              <Toggle
                label="Header & footer"
                description="Show document title and export date on the page."
                checked={settings.showHeaderFooter}
                onChange={(value) => setSettings({ showHeaderFooter: value })}
              />
              <Toggle
                label="Page numbers"
                description="Include a page number in the footer."
                checked={settings.showPageNumbers}
                onChange={(value) => setSettings({ showPageNumbers: value })}
              />
              <Toggle
                label="Number headings"
                description="Prefix H2+ headings with hierarchical numbers."
                checked={settings.autoNumberHeadings}
                onChange={(value) => setSettings({ autoNumberHeadings: value })}
              />
              <Toggle
                label="Justify text"
                description="Align paragraphs to both margins."
                checked={settings.justifyText}
                onChange={(value) => setSettings({ justifyText: value })}
              />
            </div>
          </section>
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
            <RotateCcw size={14} /> Reset defaults
          </button>
          <button type="button" className="primary-button" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  )
}
