import { AlertTriangle, FileSearch, FileWarning, Save, X } from 'lucide-react'

interface ConflictDialogProps {
  diskMtime: number
  fileName: string
  onOverwrite(): void
  onReload(): void
  onSaveAs(): void
  onCancel(): void
}

export function ConflictDialog({ diskMtime, fileName, onOverwrite, onReload, onSaveAs, onCancel }: ConflictDialogProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal conflict-modal" role="alertdialog" aria-modal="true" aria-label="File conflict">
        <header className="modal-head">
          <div className="conflict-title">
            <span className="conflict-icon"><AlertTriangle size={20} /></span>
            <div>
              <h2>File changed on disk</h2>
              <p>Another program modified <strong>{fileName}</strong>.</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} title="Cancel">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <p className="conflict-copy">
            The file was last modified at <strong>{new Date(diskMtime).toLocaleString()}</strong>. Choose how to
            continue. Overwriting will replace the version on disk.
          </p>
          <div className="conflict-actions">
            <button type="button" className="conflict-choice" onClick={onOverwrite}>
              <Save size={17} />
              <span><strong>Overwrite</strong><small>Keep my editor version</small></span>
            </button>
            <button type="button" className="conflict-choice" onClick={onReload}>
              <FileSearch size={17} />
              <span><strong>Reload</strong><small>Discard my changes and read disk</small></span>
            </button>
            <button type="button" className="conflict-choice" onClick={onSaveAs}>
              <FileWarning size={17} />
              <span><strong>Save As</strong><small>Write my version to a new file</small></span>
            </button>
          </div>
        </div>
        <footer className="modal-foot">
          <span className="modal-note">Conflict detection uses file modification time.</span>
          <button type="button" className="ghost-button" onClick={onCancel}>Cancel</button>
        </footer>
      </div>
    </div>
  )
}
