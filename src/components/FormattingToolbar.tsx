import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Bold, Italic, Strikethrough, Code, SquareCode, Link2, Image, List, ListChecks, ListOrdered,
  Minus, Heading1, Heading2, Heading3, Quote, Table2, Columns2, Eye, Copy, Check,
  ZoomIn, ZoomOut, RotateCcw, BookOpen, Monitor, MinusSquare, PlusSquare, ArrowUpDown,
  Type, FileText, AlignLeft
} from 'lucide-react'
import type { ViewMode } from '../types/document'
import type { FormatAction } from '../utils/editorActions'
import { useUIStore } from '../store/uiStore'
import { useFileStore } from '../store/fileStore'
import { useTabStore } from '../store/tabStore'
import { useI18n } from '../hooks/useI18n'
import { copyText } from '../utils/clipboard'

interface FormattingToolbarProps {
  viewMode: ViewMode
  disabled: boolean
  onViewMode(mode: ViewMode): void
  onFormat(action: FormatAction): void
}

const FORMAT_BUTTONS: Array<{ action: FormatAction; icon: typeof Bold }> = [
  { action: 'bold', icon: Bold },
  { action: 'italic', icon: Italic },
  { action: 'strike', icon: Strikethrough },
  { action: 'inlineCode', icon: Code },
  { action: 'codeBlock', icon: SquareCode },
  { action: 'link', icon: Link2 },
  { action: 'image', icon: Image },
  { action: 'bullet', icon: List },
  { action: 'numbered', icon: ListOrdered },
  { action: 'task', icon: ListChecks },
  { action: 'hr', icon: Minus },
  { action: 'h1', icon: Heading1 },
  { action: 'h2', icon: Heading2 },
  { action: 'h3', icon: Heading3 },
  { action: 'quote', icon: Quote },
  { action: 'table', icon: Table2 }
]

export function FormattingToolbar({ viewMode, disabled, onViewMode, onFormat }: FormattingToolbarProps) {
  const settings = useFileStore((s) => s.settings)
  const content = useTabStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.fileContent ?? '')
  const ui = useUIStore()
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (toolbarRef.current) {
      const target = ui.toolbarScrollLeft
      if (toolbarRef.current.scrollLeft !== target) toolbarRef.current.scrollLeft = target
    }
  }, [ui.toolbarScrollLeft])

  const handleCopyMD = useCallback(async () => {
    const ok = await copyText(content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }, [content])

  return (
    <div
      className="formatting-toolbar"
      onScroll={(e) => {
        const left = e.currentTarget.scrollLeft
        const current = useUIStore.getState().toolbarScrollLeft
        if (left !== current) useUIStore.getState().setUIState({ toolbarScrollLeft: left })
      }}
      ref={toolbarRef}
    >
      {/* Format group */}
      <div className="format-group" aria-label={t('editor.formatting')}>
        {FORMAT_BUTTONS.map((button) => {
          const Icon = button.icon
          const label = t(`editor.${button.action}`)
          return (
            <button
              key={button.action}
              type="button"
              className="tool-button"
              title={label}
              disabled={disabled}
              onClick={() => onFormat(button.action)}
              aria-label={label}
            >
              <Icon size={15} />
            </button>
          )
        })}
      </div>

      <span className="toolbar-divider" />

      {/* Theme / Font / Page / Margin */}
      <div className="format-group" aria-label={t('editor.documentStyle')}>
        <select
          aria-label={t('editor.theme')}
          className="toolbar-select"
          value={settings.theme}
          onChange={(e) => useFileStore.getState().setSettings({ theme: e.target.value as typeof settings.theme })}
        >
          <option value="modern">Modern</option>
          <option value="academic">Academic</option>
          <option value="minimal">Minimal</option>
          <option value="editorial">Editorial</option>
          <option value="legal">Legal</option>
        </select>

        <select
          aria-label={t('editor.fontSize')}
          className="toolbar-select"
          value={settings.fontSize}
          onChange={(e) => useFileStore.getState().setSettings({ fontSize: e.target.value as typeof settings.fontSize })}
        >
          <option value="sm">S</option>
          <option value="md">M</option>
          <option value="lg">L</option>
        </select>

        <select
          aria-label={t('editor.pageSize')}
          className="toolbar-select"
          value={settings.pageSize}
          onChange={(e) => useFileStore.getState().setSettings({ pageSize: e.target.value as typeof settings.pageSize })}
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>

        <select
          aria-label={t('editor.margin')}
          className="toolbar-select"
          value={settings.marginSize}
          onChange={(e) => useFileStore.getState().setSettings({ marginSize: e.target.value as typeof settings.marginSize })}
        >
          <option value="compact">Compact</option>
          <option value="normal">Normal</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>

      <span className="toolbar-divider" />

      {/* View toggles */}
      <div className="format-group" aria-label={t('editor.viewToggles')}>
        <button
          type="button"
          className={`tool-button ${ui.isPagedMode ? 'active' : ''}`}
          title={t('editor.paged')}
          onClick={ui.togglePaged}
          aria-pressed={ui.isPagedMode}
        >
          <BookOpen size={15} />
        </button>
        <button
          type="button"
          className={`tool-button ${!ui.isPagedMode ? 'active' : ''}`}
          title={t('editor.continuous')}
          onClick={ui.togglePaged}
          aria-pressed={!ui.isPagedMode}
        >
          <Monitor size={15} />
        </button>

        <button
          type="button"
          className={`tool-button ${ui.autoScroll ? 'active' : ''}`}
          title={t('editor.autoScroll')}
          onClick={ui.toggleAutoScroll}
          aria-pressed={ui.autoScroll}
        >
          <ArrowUpDown size={15} />
        </button>

        <button
          type="button"
          className={`tool-button ${ui.syncScrollWithToc ? 'active' : ''}`}
          title={t('editor.syncToc')}
          onClick={ui.toggleSyncToc}
          aria-pressed={ui.syncScrollWithToc}
        >
          <AlignLeft size={15} />
        </button>

        <button
          type="button"
          className="tool-button"
          title={t('editor.copyMarkdown')}
          onClick={handleCopyMD}
          aria-label={t('editor.copyMarkdown')}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <span className="toolbar-divider" />

      {/* Zoom controls */}
      <div className="format-group" aria-label={t('editor.zoom')}>
        <button
          type="button"
          className="tool-button"
          title={t('editor.zoomOut')}
          onClick={() => ui.setZoom(ui.zoomLevel - 10)}
          aria-label={t('editor.zoomOut')}
        >
          <ZoomOut size={15} />
        </button>
        <span className="zoom-label">{ui.zoomLevel}%</span>
        <button
          type="button"
          className="tool-button"
          title={t('editor.zoomIn')}
          onClick={() => ui.setZoom(ui.zoomLevel + 10)}
          aria-label={t('editor.zoomIn')}
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          className="tool-button"
          title={t('editor.resetZoom')}
          onClick={() => ui.setZoom(100)}
          aria-label={t('editor.resetZoom')}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <span className="toolbar-divider" />

      {/* View mode */}
      <div className="format-group" aria-label={t('editor.viewMode')}>
        <button
          type="button"
          className={`tool-button ${viewMode === 'editor' ? 'active' : ''}`}
          title={t('editor.editorOnly')}
          onClick={() => onViewMode('editor')}
          aria-pressed={viewMode === 'editor'}
        >
          <Columns2 size={15} />
        </button>
        <button
          type="button"
          className={`tool-button ${viewMode === 'split' ? 'active' : ''}`}
          title={t('editor.split')}
          onClick={() => onViewMode('split')}
          aria-pressed={viewMode === 'split'}
        >
          <Columns2 size={15} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button
          type="button"
          className={`tool-button ${viewMode === 'preview' ? 'active' : ''}`}
          title={t('editor.previewOnly')}
          onClick={() => onViewMode('preview')}
          aria-pressed={viewMode === 'preview'}
        >
          <Eye size={15} />
        </button>
      </div>
    </div>
  )
}
