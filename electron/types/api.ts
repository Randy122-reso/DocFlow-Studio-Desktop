import type {
  AppSettings,
  BinarySaveResult,
  DirtyState,
  ExternalChangeEvent,
  FileFilter,
  FilePayload,
  MenuAction,
  OpenResult,
  RecentFile,
  SaveResult,
  SessionDraft,
  UnsavedChoice,
  WindowState
} from './ipc'

export interface SaveAsResult {
  cancelled: boolean
  ok?: boolean
  path?: string
  size?: number
  mtime?: number
  conflict?: boolean
  diskMtime?: number
}

export interface DocFlowApi {
  app: {
    version(): Promise<string>
    platform(): Promise<string>
    consumeLaunchFile(): Promise<{ path: string } | null>
    openExternal(url: string): Promise<{ ok: boolean }>
    showItemInFolder(path: string): Promise<{ ok: boolean }>
    quit(): Promise<{ ok: boolean }>
    onAction(callback: (action: MenuAction) => void): () => void
    onOpenFile(callback: (payload: { path: string }) => void): () => void
    onReady(callback: (payload: { version: string; platform: string }) => void): () => void
  }
  file: {
    openDialog(): Promise<OpenResult>
    openPath(path: string): Promise<OpenResult>
    read(path: string): Promise<OpenResult>
    save(input: {
      path: string
      content: string
      expectedMtime?: number | null
      createBackup?: boolean
    }): Promise<SaveResult>
    saveAs(input: { content: string; defaultName: string; filters?: FileFilter[] }): Promise<SaveAsResult>
    saveDialog(input: { defaultName: string; filters?: FileFilter[] }): Promise<{ cancelled: boolean; path?: string }>
    info(path: string): Promise<{ path: string; size: number; mtime: number; isFile: boolean; isSymlink: boolean } | null>
    exists(path: string): Promise<boolean>
    readBinary(path: string): Promise<{ path?: string; dataBase64?: string; size?: number; mtime?: number; ok?: boolean; error?: string }>
    writeBinary(input: {
      dataBase64: string
      defaultName: string
      filters?: FileFilter[]
      path?: string
    }): Promise<BinarySaveResult>
    watch(path: string): Promise<{ watching: boolean; path: string }>
    unwatch(path: string): Promise<{ watching: boolean; path: string }>
    getPathForFile(file: File): string
    onExternalChange(callback: (event: ExternalChangeEvent) => void): () => void
  }
  recent: {
    list(): Promise<RecentFile[]>
    add(input: { path: string; displayName?: string; size?: number }): Promise<RecentFile[]>
    remove(path: string): Promise<RecentFile[]>
    clear(keepPinned?: boolean): Promise<RecentFile[]>
    pin(path: string): Promise<RecentFile[]>
    onChanged(callback: (files: RecentFile[]) => void): () => void
  }
  settings: {
    all(): Promise<AppSettings>
    get(key: keyof AppSettings): Promise<unknown>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
    reset(): Promise<AppSettings>
  }
  session: {
    save(draft: SessionDraft): Promise<{ ok: boolean }>
    load(): Promise<SessionDraft | null>
    clear(): Promise<{ ok: boolean }>
  }
  window: {
    setDirty(state: DirtyState): Promise<{ ok: boolean }>
    setTitle(title: string): Promise<{ ok: boolean }>
    minimize(): Promise<{ ok: boolean }>
    maximize(): Promise<{ maximized: boolean }>
    isMaximized(): Promise<boolean>
    close(): Promise<{ ok: boolean }>
    closeConfirmed(): Promise<{ ok: boolean }>
    state(): Promise<WindowState>
  }
  dialog: {
    confirmUnsaved(fileName: string): Promise<UnsavedChoice>
    message(input: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning'
      title?: string
      message: string
      detail?: string
      buttons?: string[]
      defaultId?: number
      cancelId?: number
    }): Promise<number>
  }
}

export type { FilePayload }
