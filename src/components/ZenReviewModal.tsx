import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { DocumentSettings } from '../types/document'
import { DOCUMENT_THEMES } from '../types/document'
import type { ThemeName } from '../../electron/types/ipc'
import { DocumentViewer } from './DocumentViewer'

interface ZenReviewModalProps {
  open: boolean
  onClose(): void
  html: string
  title: string
  settings: DocumentSettings
  onThemeChange(theme: ThemeName): void
}

export function ZenReviewModal({ open, onClose, html, title, settings, onThemeChange }: ZenReviewModalProps) {
  const [showChrome, setShowChrome] = useState(true)

  useEffect(() => {
    if (!open) return
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`zen-overlay ${showChrome ? '' : 'chrome-hidden'}`}>
      <div className="zen-bar">
        <div className="zen-title">
          <span className="zen-kicker">Zen Review</span>
          <strong>{title.replace(/\.[^.]+$/, '')}</strong>
        </div>
        <div className="zen-actions">
          <select value={settings.theme} onChange={(event) => onThemeChange(event.target.value as ThemeName)}>
            {DOCUMENT_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
          <button type="button" className="zen-hide" onClick={() => setShowChrome((value) => !value)}>
            {showChrome ? 'Hide chrome' : 'Show chrome'}
          </button>
          <button type="button" className="icon-button" onClick={onClose} title="Exit Zen Review (Esc)">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="zen-scroll">
        <DocumentViewer html={html} title={title} settings={settings} zen />
      </div>
      <button type="button" className="zen-exit-hint" onClick={onClose}>Esc to exit</button>
    </div>
  )
}
