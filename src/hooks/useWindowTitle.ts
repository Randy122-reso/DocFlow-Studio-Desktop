import { useEffect } from 'react'
import { useFileStore, isDirty } from '../store/fileStore'

export function useWindowTitle(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const sync = () => {
      const state = useFileStore.getState()
      void window.docflow.window
        .setDirty({
          dirty: isDirty(state),
          filePath: state.filePath,
          fileName: state.fileName
        })
        .catch(() => undefined)
    }

    sync()
    const unsubscribe = useFileStore.subscribe((state, previous) => {
      if (
        state.content !== previous.content ||
        state.savedContent !== previous.savedContent ||
        state.filePath !== previous.filePath ||
        state.fileName !== previous.fileName
      ) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          sync()
        }, 50)
      }
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
