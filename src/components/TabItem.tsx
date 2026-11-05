import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pin, X } from 'lucide-react'
import type { DocumentTab } from '../store/tabStore'
import { useI18n } from '../hooks/useI18n'

interface TabItemProps {
  tab: DocumentTab
  isActive: boolean
  onActivate(id: string): void
  onClose(id: string): void
  onContextMenu(event: React.MouseEvent, tab: DocumentTab): void
}

export function TabItem({ tab, isActive, onActivate, onClose, onContextMenu }: TabItemProps) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })
  const dirty = tab.fileContent !== tab.savedContent

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1
      }}
      className={`tab-item ${isActive ? 'is-active' : ''} ${tab.isPinned ? 'is-pinned' : ''} ${isDragging ? 'is-dragging' : ''}`}
      title={tab.filePath ?? tab.displayName}
      {...attributes}
      {...listeners}
      role="tab"
      aria-selected={isActive}
      onClick={() => onActivate(tab.id)}
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault()
          onClose(tab.id)
        }
      }}
      onContextMenu={(event) => onContextMenu(event, tab)}
    >
      {tab.isPinned && <Pin size={11} className="tab-pin" aria-label={t('tabs:pin')} />}
      <span className="tab-title">{tab.displayName}</span>
      {dirty && <span className="tab-dirty" title={t('tabs:dirty')} />}
      <button
        type="button"
        className="tab-close"
        aria-label={t('tabs:close')}
        title={t('tabs:close')}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onClose(tab.id)
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}
