import { useEffect } from 'react'
import { useTabStore } from '../store/tabStore'

export function useWindowTitle(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const sync = () => {
      const state = useTabStore.getState()
      if (!state.hydrated) return
      const active = state.tabs.find((tab) => tab.id === state.activeTabId) ?? null
      const dirty = state.tabs.some((tab) => tab.fileContent !== tab.savedContent)
      const suffix = state.tabs.length > 1 ? ` (+${state.tabs.length - 1})` : ''
      void window.docflow.window
        .setDirty({
          dirty,
          filePath: active?.filePath ?? null,
          fileName: `${active?.displayName ?? 'Untitled'}${suffix}`
        })
        .catch(() => undefined)
    }

    sync()
    const unsubscribe = useTabStore.subscribe((state, previous) => {
      if (
        state.tabs === previous.tabs ||
        state.activeTabId === previous.activeTabId ||
        state.hydrated !== previous.hydrated
      ) {
        return
      }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        sync()
      }, 50)
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
