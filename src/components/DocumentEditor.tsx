import { forwardRef, type KeyboardEvent } from 'react'
import { useContextMenu } from '../hooks/useContextMenu'
import type { FontFamily, FontSize } from '../../electron/types/ipc'

interface DocumentEditorProps {
  value: string
  onChange(value: string): void
  onCursorChange(position: { line: number; column: number; selection: number }): void
  fontSize: FontSize
  fontFamily: FontFamily
}

export const DocumentEditor = forwardRef<HTMLTextAreaElement, DocumentEditorProps>(function DocumentEditor(
  { value, onChange, onCursorChange, fontSize, fontFamily },
  ref
) {
  const { handleContextMenu } = useContextMenu()

  const updateCursor = (element: HTMLTextAreaElement) => {
    const before = element.value.slice(0, element.selectionStart)
    const lines = before.split('\n')
    onCursorChange({
      line: lines.length,
      column: (lines[lines.length - 1]?.length ?? 0) + 1,
      selection: Math.abs(element.selectionEnd - element.selectionStart)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const element = event.currentTarget
    element.setRangeText('  ', element.selectionStart, element.selectionEnd, 'end')
    onChange(element.value)
    updateCursor(element)
  }

  return (
    <section className="editor-pane">
      <div className="pane-header">
        <span className="pane-label">Markdown</span>
        <span className="pane-hint">{value.split('\n').length} lines</span>
      </div>
      <textarea
        ref={ref}
        className={`editor-textarea font-${fontFamily} size-${fontSize}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          updateCursor(event.target)
        }}
        onSelect={(event) => updateCursor(event.currentTarget)}
        onKeyUp={(event) => updateCursor(event.currentTarget)}
        onClick={(event) => updateCursor(event.currentTarget)}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => handleContextMenu(e, 'editor')}
        spellCheck
        placeholder="Start writing Markdown…"
        aria-label="Markdown editor"
      />
    </section>
  )
})
