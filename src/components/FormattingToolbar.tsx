import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  SquareCode,
  Strikethrough,
  Table2
} from 'lucide-react'
import type { ViewMode } from '../types/document'
import type { FormatAction } from '../utils/editorActions'

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
  { action: 'codeBlock', label: 'Code block', icon: SquareCode }
]

export function FormattingToolbar({ viewMode, disabled, onViewMode, onFormat }: FormattingToolbarProps) {
  return (
    <div className="formatting-toolbar">
      <div className="format-group">
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
            >
              <Icon size={15} />
            </button>
          )
        })}
      </div>
      <span className="toolbar-divider" />
      <div className="format-group">
        <button type="button" className="tool-button" title="Heading 1" disabled={disabled} onClick={() => onFormat('h1')}>
          <Heading1 size={16} />
        </button>
        <button type="button" className="tool-button" title="Heading 2" disabled={disabled} onClick={() => onFormat('h2')}>
          <Heading2 size={16} />
        </button>
        <button type="button" className="tool-button" title="Heading 3" disabled={disabled} onClick={() => onFormat('h3')}>
          <Heading3 size={16} />
        </button>
        <button type="button" className="tool-button" title="Blockquote" disabled={disabled} onClick={() => onFormat('quote')}>
          <Quote size={15} />
        </button>
      </div>
      <span className="toolbar-divider" />
      <div className="format-group">
        <button type="button" className="tool-button" title="Bullet list" disabled={disabled} onClick={() => onFormat('bullet')}>
          <List size={16} />
        </button>
        <button type="button" className="tool-button" title="Numbered list" disabled={disabled} onClick={() => onFormat('numbered')}>
          <ListOrdered size={16} />
        </button>
        <button type="button" className="tool-button" title="Task list" disabled={disabled} onClick={() => onFormat('task')}>
          <ListChecks size={16} />
        </button>
        <button type="button" className="tool-button" title="Link" disabled={disabled} onClick={() => onFormat('link')}>
          <Link2 size={15} />
        </button>
        <button type="button" className="tool-button" title="Image" disabled={disabled} onClick={() => onFormat('image')}>
          <Image size={15} />
        </button>
        <button type="button" className="tool-button" title="Table" disabled={disabled} onClick={() => onFormat('table')}>
          <Table2 size={15} />
        </button>
        <button type="button" className="tool-button" title="Horizontal rule" disabled={disabled} onClick={() => onFormat('hr')}>
          <Minus size={16} />
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="view-switcher" role="group" aria-label="View mode">
        <button
          type="button"
          className={viewMode === 'editor' ? 'active' : ''}
          title="Editor only"
          onClick={() => onViewMode('editor')}
        >
          <PenLine size={14} />
          <span>Write</span>
        </button>
        <button
          type="button"
          className={viewMode === 'split' ? 'active' : ''}
          title="Split view"
          onClick={() => onViewMode('split')}
        >
          <Columns2 size={14} />
          <span>Split</span>
        </button>
        <button
          type="button"
          className={viewMode === 'preview' ? 'active' : ''}
          title="Preview only"
          onClick={() => onViewMode('preview')}
        >
          <Eye size={14} />
          <span>Read</span>
        </button>
      </div>
    </div>
  )
}
