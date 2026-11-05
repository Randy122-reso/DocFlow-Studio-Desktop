import { useCallback } from 'react'

export function useContextMenu() {
  const handleContextMenu = useCallback(async (e: React.MouseEvent, type: 'editor' | 'preview') => {
    e.preventDefault()
    try {
      await window.docflow.app.showContextMenu(type)
    } catch {
      // Ignore if main process unavailable (e.g., tests)
    }
  }, [])

  return { handleContextMenu }
}
