import { create } from 'zustand'
import type { UIState } from '../types/state'

const DEFAULT_UI_STATE: UIState = {
  zoomLevel: 100,
  isPagedMode: true,
  autoScroll: false,
  syncScrollWithToc: true
}

interface UIStore extends UIState {
  setZoom(level: number): void
  togglePaged(): void
  toggleAutoScroll(): void
  toggleSyncToc(): void
  setUIState(state: Partial<UIState>): void
  loadFromSettings(settings: { uiState?: Partial<UIState> }): void
}

export const useUIStore = create<UIStore>((set, get) => ({
  ...DEFAULT_UI_STATE,

  setZoom: (level) => set({ zoomLevel: Math.max(50, Math.min(200, level)) }),
  togglePaged: () => set((s) => ({ isPagedMode: !s.isPagedMode })),
  toggleAutoScroll: () => set((s) => ({ autoScroll: !s.autoScroll })),
  toggleSyncToc: () => set((s) => ({ syncScrollWithToc: !s.syncScrollWithToc })),
  setUIState: (patch) => set((s) => ({ ...s, ...patch })),
  loadFromSettings: (settings) => {
    const patch = settings.uiState ?? {}
    set((s) => ({
      zoomLevel: typeof patch.zoomLevel === 'number' ? patch.zoomLevel : s.zoomLevel,
      isPagedMode: typeof patch.isPagedMode === 'boolean' ? patch.isPagedMode : s.isPagedMode,
      autoScroll: typeof patch.autoScroll === 'boolean' ? patch.autoScroll : s.autoScroll,
      syncScrollWithToc: typeof patch.syncScrollWithToc === 'boolean' ? patch.syncScrollWithToc : s.syncScrollWithToc
    }))
  }
}))
