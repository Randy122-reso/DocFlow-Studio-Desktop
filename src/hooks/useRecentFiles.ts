import { useEffect } from 'react'
import { useFileStore } from '../store/fileStore'

export function useRecentFiles(): void {
  useEffect(() => {
    let mounted = true
    void window.docflow.recent
      .list()
      .then((files) => {
        if (mounted) useFileStore.getState().setRecents(files)
      })
      .catch(() => undefined)

    const unsubscribe = window.docflow.recent.onChanged((files) => {
      useFileStore.getState().setRecents(files)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])
}
