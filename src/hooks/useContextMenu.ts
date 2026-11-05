import { useCallback } from 'react'

export interface ContextMenuInfo {
  tabId?: string
  hasSelection?: boolean
  isEditable?: boolean
  isPinned?: boolean
  filePath?: string | null
}

export function useContextMenu() {
  const handleContextMenu = useCallback(
    async (e: React.MouseEvent, type: 'editor' | 'preview' | 'tab', info: ContextMenuInfo = {}) => {
      e.preventDefault()
      try {
        await window.docflow.app.showContextMenu({ type, ...info })
      } catch {
        // Ignore if main process unavailable (e.g., tests)
      }
    },
    []
  )

  return { handleContextMenu }
}
