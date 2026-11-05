import { create } from 'zustand'
import type { UpdateState } from '../../electron/types/ipc'

const INITIAL_STATE: UpdateState = {
  status: 'idle',
  availableVersion: null,
  downloadProgress: 0,
  releaseNotes: null,
  lastCheckedAt: null,
  channel: 'stable',
  error: null,
  skippedVersion: null
}

interface UpdateStore {
  update: UpdateState
  skippedVersion: string | null
  dismissedVersion: string | null
  setUpdate(state: UpdateState): void
  setSkippedVersion(version: string | null): void
  setDismissedVersion(version: string | null): void
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  update: { ...INITIAL_STATE },
  skippedVersion: null,
  dismissedVersion: null,
  setUpdate: (update) => set({ update }),
  setSkippedVersion: (skippedVersion) => set({ skippedVersion }),
  setDismissedVersion: (dismissedVersion) => set({ dismissedVersion })
}))
