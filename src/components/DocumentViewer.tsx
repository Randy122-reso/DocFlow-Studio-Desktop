import { forwardRef, type MouseEvent } from 'react'
import type { DocumentSettings } from '../types/document'
import { copyText } from '../utils/clipboard'
import { useFileStore } from '../store/fileStore'
import { describeError } from '../utils/errors'

interface DocumentViewerProps {
  html: string
  title: string
  settings: DocumentSettings
  zen?: boolean
  zoomLevel?: number
  isPagedMode?: boolean
}

export const DocumentViewer = forwardRef<HTMLDivElement, DocumentViewerProps>(function DocumentViewer(
  { html, title, settings, zen = false, zoomLevel = 100, isPagedMode = true },
  ref
) {
  const handleClick = async (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const copyButton = target.closest<HTMLButtonElement>('[data-copy-code]')
    if (copyButton) {
      const block = copyButton.closest('.code-block')
      const code = block?.querySelector('code')?.textContent ?? ''
      const ok = await copyText(code)
      copyButton.textContent = ok ? 'Copied' : 'Failed'
      window.setTimeout(() => {
        copyButton.textContent = 'Copy'
      }, 1400)
      return
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]')
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('#')) {
      event.preventDefault()
      const destination = document.getElementById(href.slice(1))
      destination?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (/^https?:\/\//i.test(href)) {
      event.preventDefault()
      try {
        await window.docflow.app.openExternal(href)
      } catch (error) {
        const described = describeError(error)
        useFileStore.getState().showToast(described.kind, described.message, described.detail)
      }
    }
  }

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <section className={`preview-pane ${zen ? 'zen-preview' : ''}`}>
      <div className="preview-stage">
        <article
          ref={ref}
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
          className={`document-page theme-${settings.theme} paper-${settings.paperTone} font-${settings.fontFamily} size-${settings.fontSize} margin-${settings.marginSize} ${settings.justifyText ? 'justify-text' : ''} ${settings.autoNumberHeadings ? 'numbered-headings' : ''} ${isPagedMode ? 'paged-mode' : 'continuous-mode'}`}
        >
          {settings.showHeaderFooter && (
            <header className="doc-header">
              <span className="doc-header-title">{title}</span>
              <span className="doc-header-meta">DocFlow Studio</span>
            </header>
          )}
          <div
            className="markdown-body"
            onClick={(event) => void handleClick(event)}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {settings.showHeaderFooter && (
            <footer className="doc-footer">
              <span>{today}</span>
              {settings.showPageNumbers && <span className="doc-page-number">1</span>}
            </footer>
          )}
        </article>
      </div>
    </section>
  )
})
