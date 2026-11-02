import { useState } from 'react'
import {
  CheckCircle2,
  FileCode2,
  FileDown,
  FileText,
  Loader2,
  Printer,
  X
} from 'lucide-react'
import type { DocumentSettings } from '../types/document'
import { buildDocxBlob, buildHtmlDocument, buildWordHtml, sanitizeFileName } from '../utils/docExport'
import { buildPdfBlob, printDocument } from '../utils/pdfExport'
import { blobToBase64 } from '../utils/clipboard'
import { describeError } from '../utils/errors'

type ExportFormat = 'docx' | 'pdf-print' | 'pdf-direct' | 'doc' | 'html' | 'md'

interface ExportModalProps {
  open: boolean
  onClose(): void
  markdown: string
  title: string
  settings: DocumentSettings
  getPreviewElement(): HTMLElement | null
}

const FORMATS: Array<{
  id: ExportFormat
  label: string
  detail: string
  icon: typeof FileText
  badge: string
}> = [
  { id: 'docx', label: 'Word Document', detail: 'Native .docx with styles, tables and page numbers.', icon: FileText, badge: 'DOCX' },
  { id: 'pdf-print', label: 'PDF via Print', detail: 'Selectable text, opens the system print dialog.', icon: Printer, badge: 'PDF' },
  { id: 'pdf-direct', label: 'Direct PDF', detail: 'Raster snapshot of the page. Great for sharing.', icon: FileDown, badge: 'PDF' },
  { id: 'doc', label: 'Word HTML', detail: 'Legacy .doc that opens in Word and LibreOffice.', icon: FileCode2, badge: 'DOC' },
  { id: 'html', label: 'Standalone HTML', detail: 'Self-contained page with embedded styles.', icon: FileCode2, badge: 'HTML' },
  { id: 'md', label: 'Markdown', detail: 'Plain source file, byte-for-byte.', icon: FileText, badge: 'MD' }
]

export function ExportModal({ open, onClose, markdown, title, settings, getPreviewElement }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('docx')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ path: string; size: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const baseTitle = title.replace(/\.[^.]+$/, '') || 'Untitled'

  const saveBlob = async (blob: Blob, fileName: string, filters: Array<{ name: string; extensions: string[] }>) => {
    const dataBase64 = await blobToBase64(blob)
    const response = await window.docflow.file.writeBinary({ dataBase64, defaultName: fileName, filters })
    if (response.cancelled) return
    if (!response.ok || !response.path) throw new Error('WRITE_FAILED: The export could not be saved')
    setResult({ path: response.path, size: response.size ?? blob.size })
  }

  const runExport = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      if (format === 'pdf-print') {
        onClose()
        window.setTimeout(() => printDocument(settings), 180)
        return
      }
      if (format === 'docx') {
        const blob = await buildDocxBlob(markdown, baseTitle, settings)
        await saveBlob(blob, sanitizeFileName(baseTitle, '.docx'), [{ name: 'Word Document', extensions: ['docx'] }])
      } else if (format === 'doc') {
        const html = buildWordHtml(markdown, baseTitle, settings)
        await saveBlob(new Blob([html], { type: 'application/msword' }), sanitizeFileName(baseTitle, '.doc'), [
          { name: 'Word HTML', extensions: ['doc'] }
        ])
      } else if (format === 'html') {
        const html = buildHtmlDocument(markdown, baseTitle, settings)
        await saveBlob(new Blob([html], { type: 'text/html' }), sanitizeFileName(baseTitle, '.html'), [
          { name: 'HTML', extensions: ['html'] }
        ])
      } else if (format === 'md') {
        await saveBlob(new Blob([markdown], { type: 'text/markdown' }), sanitizeFileName(baseTitle, '.md'), [
          { name: 'Markdown', extensions: ['md'] }
        ])
      } else if (format === 'pdf-direct') {
        const element = getPreviewElement()
        if (!element) throw new Error('The preview is not available')
        const blob = await buildPdfBlob(element, baseTitle, settings)
        await saveBlob(blob, sanitizeFileName(baseTitle, '.pdf'), [{ name: 'PDF', extensions: ['pdf'] }])
      }
    } catch (caught) {
      const described = describeError(caught)
      setError(described.detail || described.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div className="modal export-modal" role="dialog" aria-modal="true" aria-label="Export document">
        <header className="modal-head">
          <div>
            <h2>Export document</h2>
            <p>Publication-grade output, generated locally.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={busy} title="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <div className="export-grid">
            {FORMATS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`export-card ${format === item.id ? 'active' : ''}`}
                  onClick={() => { setFormat(item.id); setResult(null); setError(null) }}
                  disabled={busy}
                >
                  <span className="export-icon"><Icon size={19} /></span>
                  <span className="export-copy">
                    <span className="export-title-row">
                      <strong>{item.label}</strong>
                      <span className="export-badge">{item.badge}</span>
                    </span>
                    <span>{item.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {result && (
            <div className="export-result">
              <CheckCircle2 size={16} />
              <div>
                <strong>Export complete</strong>
                <span title={result.path}>{result.path}</span>
              </div>
              <button type="button" onClick={() => void window.docflow.app.showItemInFolder(result.path)}>
                Show in folder
              </button>
            </div>
          )}
          {error && <div className="export-error">{error}</div>}
        </div>

        <footer className="modal-foot">
          <span className="modal-note">Everything is rendered on this device.</span>
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="primary-button" onClick={() => void runExport()} disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <FileDown size={15} />}
              {busy ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
