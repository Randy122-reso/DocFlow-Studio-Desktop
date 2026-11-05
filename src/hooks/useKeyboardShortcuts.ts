import { useEffect, useRef } from 'react'

export interface ShortcutHandlers {
  onNew(): void
  onOpen(): void
  onSave(): void
  onSaveAs(): void
  onExport(): void
  onFind(): void
  onReplace(): void
  onFindInFiles(): void
  onCloseTab(): void
  onNextTab(): void
  onPreviousTab(): void
  onTogglePin(): void
  onNewWindow(): void
  onFindNext(): void
  onFindPrevious(): void
  onToggleBookmark?(): void
  onNextBookmark?(): void
  onPrevBookmark?(): void
  onClearBookmarks?(): void
  onCopyMarked?(): void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'F2') {
        event.preventDefault()
        const modifier = event.ctrlKey || event.metaKey
        if (modifier && event.shiftKey) ref.current.onClearBookmarks?.()
        else if (modifier) ref.current.onToggleBookmark?.()
        else if (event.shiftKey) ref.current.onPrevBookmark?.()
        else ref.current.onNextBookmark?.()
        return
      }

      if (event.key === 'F3') {
        event.preventDefault()
        if (event.shiftKey) ref.current.onFindPrevious()
        else ref.current.onFindNext()
        return
      }

      const modifier = event.ctrlKey || event.metaKey
      if (!modifier) return
      const key = event.key.toLowerCase()

      if (key === 'b' && event.shiftKey) {
        event.preventDefault()
        ref.current.onCopyMarked?.()
        return
      }

      if (key === 'tab') {
        event.preventDefault()
        if (event.shiftKey) ref.current.onPreviousTab()
        else ref.current.onNextTab()
        return
      }
      if (key === 'p' && event.shiftKey) {
        event.preventDefault()
        ref.current.onTogglePin()
        return
      }
      if (key === 'w') {
        event.preventDefault()
        ref.current.onCloseTab()
        return
      }
      if (key === 'n' && event.shiftKey) {
        event.preventDefault()
        ref.current.onNewWindow()
        return
      }
      if (key === 'f' && event.shiftKey) {
        event.preventDefault()
        ref.current.onFindInFiles()
        return
      }
      if (key === 'h') {
        event.preventDefault()
        ref.current.onReplace()
        return
      }
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
