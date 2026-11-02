import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { DocFlowApi } from './types/api'
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
} from './types/ipc'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: DocFlowApi = {
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    platform: (): Promise<string> => ipcRenderer.invoke('app:platform'),
    consumeLaunchFile: (): Promise<{ path: string } | null> => ipcRenderer.invoke('app:consumeLaunchFile'),
    openExternal: (url: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('app:openExternal', { url }),
    showItemInFolder: (path: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('app:showItemInFolder', { path }),
    quit: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('app:quit'),
    onAction: (callback: (action: MenuAction) => void) => subscribe<MenuAction>('app:action', callback),
    onOpenFile: (callback: (payload: { path: string }) => void) =>
      subscribe<{ path: string }>('app:open-file', callback),
    onReady: (callback: (payload: { version: string; platform: string }) => void) =>
      subscribe<{ version: string; platform: string }>('app:ready', callback)
  },
  file: {
    openDialog: (): Promise<OpenResult> => ipcRenderer.invoke('file:openDialog'),
    openPath: (path: string): Promise<OpenResult> => ipcRenderer.invoke('file:openPath', { path }),
    read: (path: string): Promise<OpenResult> => ipcRenderer.invoke('file:read', { path }),
    save: (input: {
      path: string
      content: string
      expectedMtime?: number | null
      createBackup?: boolean
    }): Promise<SaveResult> => ipcRenderer.invoke('file:save', input),
    saveAs: (input: {
      content: string
      defaultName: string
      filters?: FileFilter[]
    }): Promise<{ cancelled: boolean } & Partial<FilePayload> & { ok?: boolean }> =>
      ipcRenderer.invoke('file:saveAs', input),
    saveDialog: (input: {
      defaultName: string
      filters?: FileFilter[]
    }): Promise<{ cancelled: boolean; path?: string }> => ipcRenderer.invoke('file:saveDialog', input),
    info: (path: string): Promise<{ path: string; size: number; mtime: number; isFile: boolean; isSymlink: boolean } | null> =>
      ipcRenderer.invoke('file:info', { path }),
    exists: (path: string): Promise<boolean> => ipcRenderer.invoke('file:exists', { path }),
    readBinary: (path: string): Promise<{ path?: string; dataBase64?: string; size?: number; mtime?: number; ok?: boolean; error?: string }> =>
      ipcRenderer.invoke('file:readBinary', { path }),
    writeBinary: (input: {
      dataBase64: string
      defaultName: string
      filters?: FileFilter[]
      path?: string
    }): Promise<BinarySaveResult> => ipcRenderer.invoke('file:writeBinary', input),
    watch: (path: string): Promise<{ watching: boolean; path: string }> =>
      ipcRenderer.invoke('file:watch', { path }),
    unwatch: (path: string): Promise<{ watching: boolean; path: string }> =>
      ipcRenderer.invoke('file:unwatch', { path }),
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
    onExternalChange: (callback: (event: ExternalChangeEvent) => void) =>
      subscribe<ExternalChangeEvent>('file:external-change', callback)
  },
  recent: {
    list: (): Promise<RecentFile[]> => ipcRenderer.invoke('recent:list'),
    add: (input: { path: string; displayName?: string; size?: number }): Promise<RecentFile[]> =>
      ipcRenderer.invoke('recent:add', input),
    remove: (path: string): Promise<RecentFile[]> => ipcRenderer.invoke('recent:remove', { path }),
    clear: (keepPinned = true): Promise<RecentFile[]> => ipcRenderer.invoke('recent:clear', { keepPinned }),
    pin: (path: string): Promise<RecentFile[]> => ipcRenderer.invoke('recent:pin', { path }),
    onChanged: (callback: (files: RecentFile[]) => void) => subscribe<RecentFile[]>('recent:changed', callback)
  },
  settings: {
    all: (): Promise<AppSettings> => ipcRenderer.invoke('settings:all'),
    get: (key: keyof AppSettings): Promise<unknown> => ipcRenderer.invoke('settings:get', { key }),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:set', patch),
    reset: (): Promise<AppSettings> => ipcRenderer.invoke('settings:reset')
  },
  session: {
    save: (draft: SessionDraft): Promise<{ ok: boolean }> => ipcRenderer.invoke('session:save', draft),
    load: (): Promise<SessionDraft | null> => ipcRenderer.invoke('session:load'),
    clear: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('session:clear')
  },
  window: {
    setDirty: (state: DirtyState): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:setDirty', state),
    setTitle: (title: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:setTitle', { title }),
    minimize: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<{ maximized: boolean }> => ipcRenderer.invoke('window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    close: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:close'),
    closeConfirmed: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:closeConfirmed'),
    state: (): Promise<WindowState> => ipcRenderer.invoke('window:state')
  },
  dialog: {
    confirmUnsaved: (fileName: string): Promise<UnsavedChoice> =>
      ipcRenderer.invoke('dialog:confirmUnsaved', { fileName }),
    message: (input: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning'
      title?: string
      message: string
      detail?: string
      buttons?: string[]
      defaultId?: number
      cancelId?: number
    }): Promise<number> => ipcRenderer.invoke('dialog:message', input)
  }
}

contextBridge.exposeInMainWorld('docflow', api)