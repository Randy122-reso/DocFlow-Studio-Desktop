import { useEffect, useRef, useState } from 'react'
import { FileText, Pin, PinOff, Trash2, History, X } from 'lucide-react'
import type { RecentFile } from '../../electron/types/ipc'
import { formatBytes, formatRelativeTime } from '../utils/documentStats'

interface RecentFilesMenuProps {
  recents: RecentFile[]
  onOpen(path: string): void
  onPin(path: string): void
  onRemove(path: string): void
  onClear(): void
}

export function RecentFilesMenu({ recents, onOpen, onPin, onRemove, onClear }: RecentFilesMenuProps) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const listener = (event: MouseEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('keydown', keydown)
    }
  }, [open])

  return (
    <div className="recent-menu" ref={container}>
      <button
        type="button"
        className={`icon-button ${open ? 'active' : ''}`}
        title="Recent files"
        onClick={() => setOpen((value) => !value)}
      >
        <History size={17} />
      </button>
      {open && (
        <div className="recent-popover">
          <div className="recent-head">
            <span>Recent documents</span>
            <span className="recent-count">{recents.length}</span>
          </div>
          {recents.length === 0 ? (
            <div className="recent-empty">
              <FileText size={22} />
              <p>No recent documents yet.</p>
              <span>Open a Markdown file to get started.</span>
            </div>
          ) : (
            <ul className="recent-list">
              {recents.map((file) => (
                <li key={file.path} className="recent-item">
                  <button type="button" className="recent-open" onClick={() => { onOpen(file.path); setOpen(false) }}>
                    <span className="recent-icon"><FileText size={15} /></span>
                    <span className="recent-meta">
                      <span className="recent-name">
                        {file.pinned && <Pin size={11} className="pin-mark" />}
                        {file.displayName}
                      </span>
                      <span className="recent-path">{file.path}</span>
                      <span className="recent-sub">
                        {formatRelativeTime(file.lastOpenedAt)}
                        {file.size > 0 ? ` · ${formatBytes(file.size)}` : ''}
                      </span>
                    </span>
                  </button>
                  <span className="recent-actions">
                    <button
                      type="button"
                      title={file.pinned ? 'Unpin' : 'Pin'}
                      onClick={() => onPin(file.path)}
                    >
                      {file.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </button>
                    <button type="button" title="Remove from list" onClick={() => onRemove(file.path)}>
                      <X size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {recents.length > 0 && (
            <button type="button" className="recent-clear" onClick={() => { onClear(); setOpen(false) }}>
              <Trash2 size={13} /> Clear recent (keep pinned)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
