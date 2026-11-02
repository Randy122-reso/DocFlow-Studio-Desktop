import {
  Braces,
  Download,
  FilePlus2,
  FileText,
  Focus,
  FolderOpen,
  PanelLeft,
  Save,
  SaveAll,
  Settings2
} from 'lucide-react'
import { useFileStore, useDirty } from '../store/fileStore'
import { RecentFilesMenu } from './RecentFilesMenu'

interface TopNavProps {
  onNew(): void
  onOpen(): void
  onSave(): void
  onSaveAs(): void
  onExport(): void
  onZen(): void
  onCode(): void
  onSettings(): void
  onToggleToc(): void
  onOpenRecent(path: string): void
  onPinRecent(path: string): void
  onRemoveRecent(path: string): void
  onClearRecent(): void
}

export function TopNav(props: TopNavProps) {
  const fileName = useFileStore((state) => state.fileName)
  const filePath = useFileStore((state) => state.filePath)
  const recents = useFileStore((state) => state.recents)
  const dirty = useDirty()

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 28 28" role="img" aria-label="DocFlow Studio">
            <rect x="6" y="4" width="16" height="20" rx="2" fill="#fdf6e3" />
            <path d="M18 4h4v4h-4z" fill="#e7d0a0" />
            <rect x="9" y="12" width="10" height="1.6" rx=".8" fill="#d97706" />
            <rect x="9" y="16" width="10" height="1.6" rx=".8" fill="#d97706" />
            <rect x="9" y="20" width="6" height="1.6" rx=".8" fill="#d97706" />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-name">DocFlow</span>
          <span className="brand-suffix">Studio</span>
        </div>
      </div>

      <div className="document-identity" title={filePath ?? 'Not saved yet'}>
        <FileText size={14} />
        <span className="document-name">{fileName}</span>
        {dirty ? <span className="dirty-dot" title="Unsaved changes" /> : <span className="saved-dot" title="All changes saved" />}
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-button" title="New document (Ctrl+N)" onClick={props.onNew}>
          <FilePlus2 size={17} />
        </button>
        <button type="button" className="icon-button" title="Open document (Ctrl+O)" onClick={props.onOpen}>
          <FolderOpen size={17} />
        </button>
        <button type="button" className="icon-button save-button" title="Save (Ctrl+S)" onClick={props.onSave}>
          <Save size={17} />
        </button>
        <button type="button" className="icon-button" title="Save As (Ctrl+Shift+S)" onClick={props.onSaveAs}>
          <SaveAll size={17} />
        </button>
        <RecentFilesMenu
          recents={recents}
          onOpen={props.onOpenRecent}
          onPin={props.onPinRecent}
          onRemove={props.onRemoveRecent}
          onClear={props.onClearRecent}
        />
        <span className="topbar-divider" />
        <button type="button" className="text-button accent" title="Export (Ctrl+E)" onClick={props.onExport}>
          <Download size={15} />
          <span>Export</span>
        </button>
        <button type="button" className="icon-button" title="Toggle table of contents" onClick={props.onToggleToc}>
          <PanelLeft size={17} />
        </button>
        <button type="button" className="icon-button" title="Zen review (F11)" onClick={props.onZen}>
          <Focus size={17} />
        </button>
        <button type="button" className="icon-button" title="Code scripts" onClick={props.onCode}>
          <Braces size={17} />
        </button>
        <button type="button" className="icon-button" title="Document settings" onClick={props.onSettings}>
          <Settings2 size={17} />
        </button>
      </div>
    </header>
  )
}
