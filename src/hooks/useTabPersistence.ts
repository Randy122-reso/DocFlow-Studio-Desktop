import { useEffect, useRef } from 'react'
import type { TabSnapshot, WindowBounds } from '../../electron/types/ipc'
import { snapshotToTab, useTabStore } from '../store/tabStore'
import { useSearchStore } from '../store/searchStore'

const DEFAULT_BOUNDS: WindowBounds = { width: 1400, height: 900, x: null, y: null }

interface PersistenceState {
  windowId: string | null
  bounds: WindowBounds
}

export function useTabPersistence(): void {
  const stateRef = useRef<PersistenceState>({ windowId: null, bounds: DEFAULT_BOUNDS })

  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const persistNow = async (): Promise<void> => {
      const store = useTabStore.getState()
      const windowId = store.windowId
      if (!store.hydrated || !windowId) return
      const search = useSearchStore.getState()
      const api = window.docflow?.session
      if (!api) return
      try {
        await api.save({
          window: {
            id: windowId,
            bounds: stateRef.current.bounds,
            tabs: store.toSnapshots(),
            activeTabId: store.activeTabId
          },
          findHistory: search.history,
          findOptions: search.options,
          activeWindowId: windowId
        })
      } catch {
        // Session persistence is best effort and must never interrupt typing.
      }
    }

    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void persistNow()
      }, 500)
    }

    const boot = async () => {
      const windowApi = window.docflow?.window
      try {
        if (!windowApi?.info) throw new Error('WINDOW_API_UNAVAILABLE')
        const info = await windowApi.info()
        if (disposed) return
        stateRef.current = { windowId: info.id, bounds: info.bounds }
        const initial = info.initialTabs ?? []
        useTabStore.getState().hydrate(
          initial.map((snapshot: TabSnapshot) => snapshotToTab(snapshot)),
          info.activeTabId,
          info.id
        )
      } catch {
        // Browser/test environments do not provide the Electron bridge.
        useTabStore.getState().setHydrated(true)
      }

      try {
        const saved = await window.docflow?.session?.load?.()
        if (!disposed && saved) {
          useSearchStore.getState().hydrate(saved.findHistory ?? [], saved.findOptions)
        }
      } catch {
        // A missing or unreadable session is equivalent to a fresh launch.
      }
    }

    void boot()

    const unsubscribeTabs = useTabStore.subscribe(schedule)
    const unsubscribeSearch = useSearchStore.subscribe(schedule)
    const unsubscribeBounds = window.docflow?.window?.onBoundsChanged
      ? window.docflow.window.onBoundsChanged(({ bounds }) => {
          stateRef.current.bounds = bounds
          schedule()
        })
      : () => undefined

    const flush = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      void persistNow()
    }
    window.addEventListener('beforeunload', flush)

    return () => {
      disposed = true
      unsubscribeTabs()
      unsubscribeSearch()
      unsubscribeBounds()
      window.removeEventListener('beforeunload', flush)
      if (timer) clearTimeout(timer)
    }
  }, [])
}
