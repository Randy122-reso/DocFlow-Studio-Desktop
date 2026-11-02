import { AlertTriangle, FileClock, FolderOpen, RotateCcw, Trash2 } from 'lucide-react'
import type { RecoveryState } from '../types/document'

interface RecoveryPromptProps {
  recovery: RecoveryState
  onRestore(): void
  onDiscard(): void
  onOpenOriginal(): void
}

export function RecoveryPrompt({ recovery, onRestore, onDiscard, onOpenOriginal }: RecoveryPromptProps) {
  const time = new Date(recovery.timestamp).toLocaleString()

  return (
    <div className="modal-backdrop recovery-backdrop">
      <div className="modal recovery-modal" role="alertdialog" aria-modal="true" aria-label="Recover draft">
        <div className="recovery-icon"><FileClock size={26} /></div>
        <h2>Recover unsaved changes?</h2>
        <p>
          DocFlow found a draft from <strong>{time}</strong> for{' '}
          <strong>{recovery.fileName}</strong>.
        </p>
        <div className="recovery-meta">
          <span><AlertTriangle size={13} /> {recovery.fileContent.length.toLocaleString()} characters in draft</span>
          <span>{recovery.filePath ?? 'The document had never been saved to disk.'}</span>
        </div>
        <div className="recovery-actions">
          <button type="button" className="primary-button" onClick={onRestore}>
            <RotateCcw size={15} /> Restore draft
          </button>
          {recovery.filePath && (
            <button type="button" className="ghost-button" onClick={onOpenOriginal}>
              <FolderOpen size={15} /> Open original
            </button>
          )}
          <button type="button" className="ghost-button danger" onClick={onDiscard}>
            <Trash2 size={15} /> Discard
          </button>
        </div>
      </div>
    </div>
  )
}
