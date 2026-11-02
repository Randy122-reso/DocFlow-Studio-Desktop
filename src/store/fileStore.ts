import { create } from 'zustand'
import type { FilePayload, RecentFile, TextEncoding, LineEnding } from '../../electron/types/ipc'
import type {
  ConflictState,
  DocumentSettings,
  ExternalChange,
  RecoveryState,
  ToastKind,
  ToastMessage,
  ViewMode
} from '../types/document'
import { DEFAULT_DOCUMENT_SETTINGS } from '../types/document'
import { WELCOME_DOCUMENT } from '../utils/sampleDocuments'

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

interface FileStore {
  filePath: string | null
  fileName: string
  content: string
  savedContent: string
  diskMtime: number | null
  encoding: TextEncoding
  lineEnding: LineEnding
  settings: DocumentSettings
  viewMode: ViewMode
  recents: RecentFile[]
  toast: ToastMessage | null
  recovery: RecoveryState | null
  conflict: ConflictState | null
  externalChange: ExternalChange | null
  booted: boolean

  setContent(content: string): void
  loadDocument(payload: FilePayload): void
  loadRecovery(recovery: RecoveryState): void
  newDocument(content?: string): void
  markSaved(path: string, content: string, mtime: number): void
  setSettings(patch: Partial<DocumentSettings>): void
  setViewMode(mode: ViewMode): void
  setRecents(files: RecentFile[]): void
  showToast(kind: ToastKind, message: string, detail?: string): void
  dismissToast(id?: number): void
  setRecovery(recovery: RecoveryState | null): void
  setConflict(conflict: ConflictState | null): void
  setExternalChange(change: ExternalChange | null): void
  setBooted(value: boolean): void
}

let toastId = 0

export const useFileStore = create<FileStore>((set) => ({
  filePath: null,
  fileName: 'Welcome.md',
  content: WELCOME_DOCUMENT,
  savedContent: WELCOME_DOCUMENT,
  diskMtime: null,
  encoding: 'utf-8',
  lineEnding: 'lf',
  settings: { ...DEFAULT_DOCUMENT_SETTINGS },
  viewMode: 'split',
  recents: [],
  toast: null,
  recovery: null,
  conflict: null,
  externalChange: null,
  booted: false,

  setContent: (content) => set({ content }),

  loadDocument: (payload) =>
    set({
      filePath: payload.path,
      fileName: payload.name || baseName(payload.path),
      content: payload.content,
      savedContent: payload.content,
      diskMtime: payload.mtime,
      encoding: payload.encoding,
      lineEnding: payload.lineEnding,
      conflict: null,
      externalChange: null,
      recovery: null
    }),

  loadRecovery: (recovery) =>
    set({
      filePath: recovery.filePath,
      fileName: recovery.fileName,
      content: recovery.fileContent,
      savedContent: recovery.savedContent,
      diskMtime: recovery.diskMtime,
      recovery: null
    }),

  newDocument: (content = '') =>
    set({
      filePath: null,
      fileName: 'Untitled.md',
      content,
      savedContent: content,
      diskMtime: null,
      encoding: 'utf-8',
      lineEnding: 'lf',
      conflict: null,
      externalChange: null,
      recovery: null
    }),

  markSaved: (path, content, mtime) =>
    set({
      filePath: path,
      fileName: baseName(path),
      content,
      savedContent: content,
      diskMtime: mtime,
      conflict: null,
      externalChange: null
    }),

  setSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch }
    })),

  setViewMode: (viewMode) => set({ viewMode }),

  setRecents: (recents) => set({ recents }),

  showToast: (kind, message, detail) => {
    toastId += 1
    set({ toast: { id: toastId, kind, message, detail } })
  },

  dismissToast: (id) =>
    set((state) => {
      if (!state.toast) return state
      if (id !== undefined && state.toast.id !== id) return state
      return { toast: null }
    }),

  setRecovery: (recovery) => set({ recovery }),
  setConflict: (conflict) => set({ conflict }),
  setExternalChange: (externalChange) => set({ externalChange }),
  setBooted: (booted) => set({ booted })
}))

export function isDirty(state: Pick<FileStore, 'content' | 'savedContent'>): boolean {
  return state.content !== state.savedContent
}

export function useDirty(): boolean {
  return useFileStore((state) => state.content !== state.savedContent)
}
