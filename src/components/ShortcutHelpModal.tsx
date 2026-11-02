import { X } from 'lucide-react'

interface ShortcutHelpModalProps {
  open: boolean
  onClose(): void
}

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: 'Ctrl + N', label: 'New document' },
  { keys: 'Ctrl + O', label: 'Open document' },
  { keys: 'Ctrl + S', label: 'Save in place' },
  { keys: 'Ctrl + Shift + S', label: 'Save As' },
  { keys: 'Ctrl + E', label: 'Open export dialog' },
  { keys: 'Ctrl + \\', label: 'Toggle table of contents' },
  { keys: 'Ctrl + /', label: 'Keyboard shortcuts' },
  { keys: 'F11', label: 'Zen review' },
  { keys: 'Esc', label: 'Close modal / exit Zen review' },
  { keys: 'Tab', label: 'Insert two spaces in the editor' }
]

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal shortcuts-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <header className="modal-head">
          <div>
            <h2>Keyboard shortcuts</h2>
            <p>Keep your hands on the keyboard.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          <dl className="shortcut-list">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys} className="shortcut-row">
                <dt>{shortcut.label}</dt>
                <dd><kbd>{shortcut.keys}</kbd></dd>
              </div>
            ))}
          </dl>
        </div>
        <footer className="modal-foot">
          <button type="button" className="primary-button" onClick={onClose}>Got it</button>
        </footer>
      </div>
    </div>
  )
}
