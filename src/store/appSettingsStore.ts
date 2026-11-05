import { create } from 'zustand'
import type { AppSettings } from '../../electron/types/ipc'

interface AppSettingsStore {
  settings: AppSettings | null
  setSettings(settings: AppSettings): void
  patchSettings(patch: Partial<AppSettings>): void
}

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
  patchSettings: (patch) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...patch } : state.settings
    }))
}))
