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
import { buildPdfBlob, buildVectorPdfBlob, printDocument, UnsupportedVectorGlyphError } from '../utils/pdfExport'
import { blobToBase64 } from '../utils/clipboard'
import { describeError } from '../utils/errors'
import { useI18n } from '../hooks/useI18n'

type ExportFormat = 'docx' | 'pdf-vector' | 'pdf-raster' | 'pdf-print' | 'doc' | 'html' | 'md'

interface ExportModalProps {
  open: boolean
  onClose(): void
  markdown: string
  title: string
  settings: DocumentSettings
  getPreviewElement(): HTMLElement | null
}

interface FormatItem {
  id: ExportFormat
  labelKey: string
  detailKey: string
  icon: typeof FileText
  badge: string
}

const FORMATS: FormatItem[] = [
  { id: 'docx', labelKey: 'exportDocx', detailKey: 'exportDocxDetail', icon: FileText, badge: 'DOCX' },
  { id: 'pdf-vector', labelKey: 'exportVector', detailKey: 'exportVectorDetail', icon: FileDown, badge: 'PDF' },
  { id: 'pdf-raster', labelKey: 'exportRaster', detailKey: 'exportRasterDetail', icon: FileDown, badge: 'PDF' },
  { id: 'pdf-print', labelKey: 'exportPrint', detailKey: 'exportPrintDetail', icon: Printer, badge: 'PDF' },
  { id: 'doc', labelKey: 'exportDoc', detailKey: 'exportDocDetail', icon: FileCode2, badge: 'DOC' },
  { id: 'html', labelKey: 'exportHtml', detailKey: 'exportHtmlDetail', icon: FileCode2, badge: 'HTML' },
  { id: 'md', labelKey: 'exportMarkdown', detailKey: 'exportMarkdownDetail', icon: FileText, badge: 'MD' }
]

export function ExportModal({ open, onClose, markdown, title, settings, getPreviewElement }: ExportModalProps) {
  const { t } = useI18n()
  const [format, setFormat] = useState<ExportFormat>('pdf-vector')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ path: string; size: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!open) return null

  const baseTitle = title.replace(/\.[^.]+$/, '') || 'Untitled'

  const saveBlob = async (blob: Blob, fileName: string, filters: Array<{ name: string; extensions: string[] }>) => {
    const dataBase64 = await blobToBase64(blob)
    const response = await window.docflow.file.writeBinary({ dataBase64, defaultName: fileName, filters })
    if (response.cancelled) return
    if (!response.ok || !response.path) throw new Error(t('writeFailed'))
    setResult({ path: response.path, size: response.size ?? blob.size })
  }

  const saveRasterPdf = async () => {
    const element = getPreviewElement()
    if (!element) throw new Error(t('previewUnavailable'))
    const blob = await buildPdfBlob(element, baseTitle, settings)
    await saveBlob(blob, sanitizeFileName(baseTitle, '.pdf'), [{ name: 'PDF', extensions: ['pdf'] }])
  }

  const runExport = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
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
      } else if (format === 'pdf-vector') {
        try {
          const blob = await buildVectorPdfBlob(markdown, baseTitle, settings)
          await saveBlob(blob, sanitizeFileName(baseTitle, '.pdf'), [{ name: 'PDF', extensions: ['pdf'] }])
        } catch (caught) {
          if (!(caught instanceof UnsupportedVectorGlyphError)) throw caught
          setNotice(t('vectorFallback', { glyph: caught.glyph }))
          await saveRasterPdf()
        }
      } else if (format === 'pdf-raster') {
        await saveRasterPdf()
      }
    } catch (caught) {
      const described = describeError(caught)
      if (described.message === 'WRITE_FAILED' || described.detail) {
        setError(described.detail || described.message)
      } else {
        setError(described.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div className="modal export-modal" role="dialog" aria-modal="true" aria-label={t('exportTitle')}>
        <header className="modal-head">
          <div>
            <h2>{t('exportTitle')}</h2>
            <p>{t('publicationOutput')}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={busy} title={t('close')}>
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
                  onClick={() => { setFormat(item.id); setResult(null); setError(null); setNotice(null) }}
                  disabled={busy}
                >
                  <span className="export-icon"><Icon size={19} /></span>
                  <span className="export-copy">
                    <span className="export-title-row">
                      <strong>{t(item.labelKey)}</strong>
                      <span className="export-badge">{item.badge}</span>
                    </span>
                    <span>{t(item.detailKey)}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {result && (
            <div className="export-result">
              <CheckCircle2 size={16} />
              <div>
                <strong>{t('exportComplete')}</strong>
                <span title={result.path}>{result.path}</span>
              </div>
              <button type="button" onClick={() => void window.docflow.app.showItemInFolder(result.path)}>
                {t('showInFolder')}
              </button>
            </div>
          )}
          {notice && <div className="export-notice">{notice}</div>}
          {error && <div className="export-error">{error}</div>}
        </div>

        <footer className="modal-foot">
          <span className="modal-note">{t('everythingLocal')}</span>
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>{t('cancel')}</button>
            <button type="button" className="primary-button" onClick={() => void runExport()} disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <FileDown size={15} />}
              {busy ? t('exporting') : t('export')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
