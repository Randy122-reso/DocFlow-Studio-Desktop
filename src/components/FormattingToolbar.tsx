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
import { copyText } from '../utils/clipboard'

interface FormattingToolbarProps {
  viewMode: ViewMode
  disabled: boolean
  onViewMode(mode: ViewMode): void
  onFormat(action: FormatAction): void
}

const FORMAT_BUTTONS: Array<{ action: FormatAction; label: string; icon: typeof Bold }> = [
  { action: 'bold', label: 'Bold (Ctrl+B)', icon: Bold },
  { action: 'italic', label: 'Italic (Ctrl+I)', icon: Italic },
  { action: 'strike', label: 'Strikethrough', icon: Strikethrough },
  { action: 'inlineCode', label: 'Inline code', icon: Code },
  { action: 'codeBlock', label: 'Code block', icon: SquareCode },
  { action: 'link', label: 'Link', icon: Link2 },
  { action: 'image', label: 'Image', icon: Image },
  { action: 'bullet', label: 'Bullet list', icon: List },
  { action: 'numbered', label: 'Numbered list', icon: ListOrdered },
  { action: 'task', label: 'Task list', icon: ListChecks },
  { action: 'hr', label: 'Horizontal rule', icon: Minus },
  { action: 'h1', label: 'Heading 1', icon: Heading1 },
  { action: 'h2', label: 'Heading 2', icon: Heading2 },
  { action: 'h3', label: 'Heading 3', icon: Heading3 },
  { action: 'quote', label: 'Blockquote', icon: Quote },
  { action: 'table', label: 'Table', icon: Table2 }
]

export function FormattingToolbar({ viewMode, disabled, onViewMode, onFormat }: FormattingToolbarProps) {
  const settings = useFileStore((s) => s.settings)
  const ui = useUIStore()
  const [copied, setCopied] = useState(false)
  const content = useFileStore((s) => s.content)
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
      <div className="format-group" aria-label="Formatting">
        {FORMAT_BUTTONS.map((button) => {
          const Icon = button.icon
          return (
            <button
              key={button.action}
              type="button"
              className="tool-button"
              title={button.label}
              disabled={disabled}
              onClick={() => onFormat(button.action)}
              aria-label={button.label}
            >
              <Icon size={15} />
            </button>
          )
        })}
      </div>

      <span className="toolbar-divider" />

      {/* Theme / Font / Page / Margin */}
      <div className="format-group" aria-label="Document style">
        <select
          aria-label="Theme"
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
          aria-label="Font size"
          className="toolbar-select"
          value={settings.fontSize}
          onChange={(e) => useFileStore.getState().setSettings({ fontSize: e.target.value as typeof settings.fontSize })}
        >
          <option value="sm">S</option>
          <option value="md">M</option>
          <option value="lg">L</option>
        </select>

        <select
          aria-label="Page size"
          className="toolbar-select"
          value={settings.pageSize}
          onChange={(e) => useFileStore.getState().setSettings({ pageSize: e.target.value as typeof settings.pageSize })}
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>

        <select
          aria-label="Margin"
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
      <div className="format-group" aria-label="View toggles">
        <button
          type="button"
          className={`tool-button ${ui.isPagedMode ? 'active' : ''}`}
          title="Paged mode"
          onClick={ui.togglePaged}
          aria-pressed={ui.isPagedMode}
        >
          <BookOpen size={15} />
        </button>
        <button
          type="button"
          className={`tool-button ${!ui.isPagedMode ? 'active' : ''}`}
          title="Continuous mode"
          onClick={ui.togglePaged}
          aria-pressed={!ui.isPagedMode}
        >
          <Monitor size={15} />
        </button>

        <button
          type="button"
          className={`tool-button ${ui.autoScroll ? 'active' : ''}`}
          title="Auto-scroll"
          onClick={ui.toggleAutoScroll}
          aria-pressed={ui.autoScroll}
        >
          <ArrowUpDown size={15} />
        </button>

        <button
          type="button"
          className={`tool-button ${ui.syncScrollWithToc ? 'active' : ''}`}
          title="Sync TOC scroll"
          onClick={ui.toggleSyncToc}
          aria-pressed={ui.syncScrollWithToc}
        >
          <AlignLeft size={15} />
        </button>

        <button
          type="button"
          className="tool-button"
          title="Copy Markdown"
          onClick={handleCopyMD}
          aria-label="Copy Markdown"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <span className="toolbar-divider" />

      {/* Zoom controls */}
      <div className="format-group" aria-label="Zoom">
        <button
          type="button"
          className="tool-button"
          title="Zoom out"
          onClick={() => ui.setZoom(ui.zoomLevel - 10)}
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <span className="zoom-label">{ui.zoomLevel}%</span>
        <button
          type="button"
          className="tool-button"
          title="Zoom in"
          onClick={() => ui.setZoom(ui.zoomLevel + 10)}
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          className="tool-button"
          title="Reset zoom"
          onClick={() => ui.setZoom(100)}
          aria-label="Reset zoom"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <span className="toolbar-divider" />

      {/* View mode */}
      <div className="format-group" aria-label="View mode">
        <button
          type="button"
          className={`tool-button ${viewMode === 'editor' ? 'active' : ''}`}
          title="Editor only"
          onClick={() => onViewMode('editor')}
          aria-pressed={viewMode === 'editor'}
        >
          <Columns2 size={15} />
        </button>
        <button
          type="button"
          className={`tool-button ${viewMode === 'split' ? 'active' : ''}`}
          title="Split"
          onClick={() => onViewMode('split')}
          aria-pressed={viewMode === 'split'}
        >
          <Columns2 size={15} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button
          type="button"
          className={`tool-button ${viewMode === 'preview' ? 'active' : ''}`}
          title="Preview only"
          onClick={() => onViewMode('preview')}
          aria-pressed={viewMode === 'preview'}
        >
          <Eye size={15} />
        </button>
      </div>
    </div>
  )
}
