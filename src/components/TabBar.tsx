import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { DocumentTab } from '../store/tabStore'
import { useTabStore } from '../store/tabStore'
import { useI18n } from '../hooks/useI18n'
import { useContextMenu } from '../hooks/useContextMenu'
import { TabItem } from './TabItem'

interface TabBarProps {
  onNewTab(): void
  onCloseTab(id: string): void
  onDetachTab(id: string): void
}

const DETACH_THRESHOLD = 150

export function TabBar({ onNewTab, onCloseTab, onDetachTab }: TabBarProps) {
  const tabs = useTabStore((state) => state.tabs)
  const activeId = useTabStore((state) => state.activeTabId)
  const activateTab = useTabStore((state) => state.activateTab)
  const moveTab = useTabStore((state) => state.moveTab)
  const { handleContextMenu } = useContextMenu()
  const { t } = useI18n()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragEnd = (event: DragEndEvent) => {
    const active = String(event.active.id)
    if (event.over && event.over.id !== event.active.id) {
      moveTab(active, String(event.over.id))
      return
    }
    if (!event.over && Math.abs(event.delta.x) > DETACH_THRESHOLD) {
      onDetachTab(active)
    }
  }

  return (
    <div className="tabbar" role="tablist" aria-label={t('tabs:tabs')}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
          <div className="tabbar-scroll">
            {tabs.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeId}
                onActivate={activateTab}
                onClose={onCloseTab}
                onContextMenu={(event, item: DocumentTab) =>
                  void handleContextMenu(event, 'tab', {
                    tabId: item.id,
                    isPinned: item.isPinned,
                    filePath: item.filePath
                  })
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" className="tab-new" title={t('tabs:newTab')} aria-label={t('tabs:newTab')} onClick={onNewTab}>
        <Plus size={15} />
      </button>
    </div>
  )
}
