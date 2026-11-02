import { useEffect, useRef } from 'react'

export interface ShortcutHandlers {
  onNew(): void
  onOpen(): void
  onSave(): void
  onSaveAs(): void
  onExport(): void
  onFind(): void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      const modifier = event.ctrlKey || event.metaKey
      if (!modifier) return
      const key = event.key.toLowerCase()

      if (key === 's') {
        event.preventDefault()
        if (event.shiftKey) ref.current.onSaveAs()
        else ref.current.onSave()
        return
      }
      if (key === 'o') {
        event.preventDefault()
        ref.current.onOpen()
        return
      }
      if (key === 'n') {
        event.preventDefault()
        ref.current.onNew()
        return
      }
      if (key === 'e') {
        event.preventDefault()
        ref.current.onExport()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        ref.current.onFind()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}
