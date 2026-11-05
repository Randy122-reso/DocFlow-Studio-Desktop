import { create } from 'zustand'
import type { FilePayload, TabSnapshot, TextEncoding, LineEnding } from '../../electron/types/ipc'
import type { ConflictState, ExternalChange } from '../types/document'
import { WELCOME_DOCUMENT } from '../utils/sampleDocuments'

export const MAX_TABS = 30

export interface DocumentTab extends TabSnapshot {
  conflict: ConflictState | null
  externalChange: ExternalChange | null
}

export interface CloseResult {
  closed: boolean
  reason?: 'missing' | 'pinned' | 'dirty'
}

interface TabStore {
  tabs: DocumentTab[]
  activeTabId: string | null
  windowId: string | null
  reopenStack: TabSnapshot[]
  hydrated: boolean
  untitledCounter: number

  hydrate(tabs: DocumentTab[], activeTabId: string | null, windowId: string): void
  setWindowId(windowId: string): void
  openTab(payload: FilePayload, activate?: boolean): { ok: boolean; id?: string; reason?: 'duplicate' | 'max' }
  openSnapshot(snapshot: TabSnapshot, activate?: boolean): { ok: boolean; id?: string; reason?: 'duplicate' | 'max' }
  newTab(content?: string, activate?: boolean): { ok: boolean; id?: string; reason?: 'max' }
  activateTab(id: string): void
  setBuffer(id: string, content: string): void
  updateTab(id: string, patch: Partial<DocumentTab>): void
  closeTab(id: string): CloseResult
  closeOthers(id: string): void
  closeToRight(id: string): void
  closeToLeft(id: string): void
  closeAll(): void
  togglePin(id: string): void
  moveTab(activeId: string, overId: string): void
  markSaved(id: string, path: string, content: string, mtime: number): void
  markSavedContent(id: string, savedContent: string): void
  setConflict(id: string, conflict: ConflictState | null): void
  setExternalChange(id: string, change: ExternalChange | null): void
  setAllExternalChanges(change: ExternalChange | null): void
  getActive(): DocumentTab | null
  getTab(id: string): DocumentTab | null
  toSnapshots(): TabSnapshot[]
  pruneEmpty(): void
  setHydrated(value: boolean): void
}

let idCounter = 0

function createId(): string {
  idCounter += 1
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : null
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()
  return `tab-${Date.now()}-${idCounter}`
}

export function isTabDirty(tab: Pick<DocumentTab, 'fileContent' | 'savedContent'>): boolean {
  return tab.fileContent !== tab.savedContent
}

export function snapshotToTab(snapshot: TabSnapshot): DocumentTab {
  return {
    ...snapshot,
    conflict: null,
    externalChange: null
  }
}

function makeTab(options: {
  filePath: string | null
  displayName: string
  fileContent: string
  savedContent?: string
  diskMtime?: number | null
  encoding?: TextEncoding
  lineEnding?: LineEnding
  isPinned?: boolean
}): DocumentTab {
  return {
    id: createId(),
    filePath: options.filePath,
    displayName: options.displayName,
    fileContent: options.fileContent,
    savedContent: options.savedContent ?? options.fileContent,
    diskMtime: options.diskMtime ?? null,
    encoding: options.encoding ?? 'utf-8',
    lineEnding: options.lineEnding ?? 'lf',
    isPinned: options.isPinned ?? false,
    editorScrollTop: 0,
    previewScrollTop: 0,
    cursorOffset: 0,
    selectionEnd: 0,
    conflict: null,
    externalChange: null
  }
}

function sortPinned(tabs: DocumentTab[]): DocumentTab[] {
  const pinned = tabs.filter((tab) => tab.isPinned)
  const regular = tabs.filter((tab) => !tab.isPinned)
  return [...pinned, ...regular]
}

function neighbourId(tabs: DocumentTab[], id: string): string | null {
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0) return tabs[0]?.id ?? null
  return tabs[index + 1]?.id ?? tabs[index - 1]?.id ?? null
}

function initialStore() {
  const welcome = makeTab({
    filePath: null,
    displayName: 'Welcome.md',
    fileContent: WELCOME_DOCUMENT
  })
  return {
    tabs: [welcome],
    activeTabId: welcome.id,
    windowId: null,
    reopenStack: [] as TabSnapshot[],
    hydrated: false,
    untitledCounter: 1
  }
}

export const useTabStore = create<TabStore>((set, get) => ({
  ...initialStore(),

  hydrate: (tabs, activeTabId, windowId) => {
    const hydratedTabs = tabs.length > 0 ? tabs : initialStore().tabs
    const active = hydratedTabs.some((tab) => tab.id === activeTabId) ? activeTabId : hydratedTabs[0].id
    set({
      tabs: sortPinned(hydratedTabs),
      activeTabId: active,
      windowId,
      hydrated: true
    })
  },

  setWindowId: (windowId) => set({ windowId }),

  openTab: (payload, activate = true) => {
    const state = get()
    if (payload.path) {
      const existing = state.tabs.find((tab) => tab.filePath === payload.path)
      if (existing) {
        if (activate) set({ activeTabId: existing.id })
        return { ok: true, id: existing.id, reason: 'duplicate' }
      }
    }
    if (state.tabs.length >= MAX_TABS) return { ok: false, reason: 'max' }
    const tab = makeTab({
      filePath: payload.path,
      displayName: payload.name,
      fileContent: payload.content,
      savedContent: payload.content,
      diskMtime: payload.mtime,
      encoding: payload.encoding,
      lineEnding: payload.lineEnding
    })
    set({
      tabs: [...state.tabs, tab],
      activeTabId: activate ? tab.id : state.activeTabId
    })
    return { ok: true, id: tab.id }
  },

  openSnapshot: (snapshot, activate = true) => {
    const state = get()
    if (snapshot.filePath) {
      const existing = state.tabs.find((tab) => tab.filePath === snapshot.filePath)
      if (existing) {
        if (activate) set({ activeTabId: existing.id })
        return { ok: true, id: existing.id, reason: 'duplicate' }
      }
    }
    if (state.tabs.length >= MAX_TABS) return { ok: false, reason: 'max' }
    const tab = snapshotToTab({ ...snapshot, id: createId() })
    set({
      tabs: sortPinned([...state.tabs, tab]),
      activeTabId: activate ? tab.id : state.activeTabId
    })
    return { ok: true, id: tab.id }
  },

  newTab: (content = '', activate = true) => {
    const state = get()
    if (state.tabs.length >= MAX_TABS) return { ok: false, reason: 'max' }
    const name = `Untitled${state.untitledCounter > 1 ? ` ${state.untitledCounter}` : ''}.md`
    const tab = makeTab({
      filePath: null,
      displayName: name,
      fileContent: content
    })
    set({
      tabs: [...state.tabs, tab],
      activeTabId: activate ? tab.id : state.activeTabId,
      untitledCounter: state.untitledCounter + 1
    })
    return { ok: true, id: tab.id }
  },

  activateTab: (id) => {
    if (get().tabs.some((tab) => tab.id === id)) set({ activeTabId: id })
  },

  setBuffer: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, fileContent: content } : tab))
    })),

  updateTab: (id, patch) =>
    set((state) => ({
      tabs: sortPinned(state.tabs.map((tab) => (tab.id === id ? { ...tab, ...patch, id } : tab)))
    })),

  closeTab: (id) => {
    const state = get()
    const target = state.tabs.find((tab) => tab.id === id)
    if (!target) return { closed: false, reason: 'missing' }
    const remaining = state.tabs.filter((tab) => tab.id !== id)
    const nextActive = state.activeTabId === id ? neighbourId(state.tabs, id) : state.activeTabId
    const reopen = remaining.length > 0 ? [...state.reopenStack, target].slice(-10) : state.reopenStack
    set({
      tabs: remaining,
      activeTabId: nextActive && remaining.some((tab) => tab.id === nextActive) ? nextActive : remaining[0]?.id ?? null,
      reopenStack: reopen
    })
    if (remaining.length === 0) {
      const store = get()
      store.newTab('', true)
    }
    return { closed: true }
  },

  closeOthers: (id) => {
    const state = get()
    const kept = state.tabs.filter((tab) => tab.id === id || tab.isPinned)
    set({
      tabs: kept,
      activeTabId: kept.some((tab) => tab.id === state.activeTabId) ? state.activeTabId : id
    })
  },

  closeToRight: (id) => {
    const state = get()
    const index = state.tabs.findIndex((tab) => tab.id === id)
    if (index < 0) return
    const kept = state.tabs.filter((tab, position) => position <= index || tab.isPinned)
    set({
      tabs: kept,
      activeTabId: kept.some((tab) => tab.id === state.activeTabId) ? state.activeTabId : id
    })
  },

  closeToLeft: (id) => {
    const state = get()
    const index = state.tabs.findIndex((tab) => tab.id === id)
    if (index < 0) return
    const kept = state.tabs.filter((tab, position) => position >= index || tab.isPinned)
    set({
      tabs: kept,
      activeTabId: kept.some((tab) => tab.id === state.activeTabId) ? state.activeTabId : id
    })
  },

  closeAll: () => {
    const state = get()
    const kept = state.tabs.filter((tab) => tab.isPinned)
    if (kept.length === 0) {
      const store = get()
      store.newTab('', true)
    } else {
      set({ tabs: kept, activeTabId: kept[0].id })
    }
  },

  togglePin: (id) =>
    set((state) => ({
      tabs: sortPinned(
        state.tabs.map((tab) => (tab.id === id ? { ...tab, isPinned: !tab.isPinned } : tab))
      )
    })),

  moveTab: (activeId, overId) => {
    const state = get()
    const from = state.tabs.findIndex((tab) => tab.id === activeId)
    const to = state.tabs.findIndex((tab) => tab.id === overId)
    if (from < 0 || to < 0 || from === to) return
    const source = state.tabs[from]
    const target = state.tabs[to]
    if (source.isPinned !== target.isPinned) return
    const tabs = [...state.tabs]
    const [moved] = tabs.splice(from, 1)
    tabs.splice(to, 0, moved)
    set({ tabs })
  },

  markSaved: (id, path, content, mtime) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              filePath: path,
              displayName: path.split(/[\\/]/).pop() || tab.displayName,
              fileContent: content,
              savedContent: content,
              diskMtime: mtime,
              conflict: null,
              externalChange: null
            }
          : tab
      )
    })),

  markSavedContent: (id, savedContent) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, savedContent } : tab))
    })),

  setConflict: (id, conflict) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, conflict } : tab))
    })),

  setExternalChange: (id, change) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, externalChange: change } : tab))
    })),

  setAllExternalChanges: (change) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        change && tab.filePath === change.path ? { ...tab, externalChange: change } : { ...tab, externalChange: null }
      )
    })),

  getActive: () => {
    const state = get()
    return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null
  },

  getTab: (id) => get().tabs.find((tab) => tab.id === id) ?? null,

  toSnapshots: () =>
    get().tabs.map((tab) => ({
      id: tab.id,
      filePath: tab.filePath,
      displayName: tab.displayName,
      fileContent: tab.fileContent,
      savedContent: tab.savedContent,
      diskMtime: tab.diskMtime,
      encoding: tab.encoding,
      lineEnding: tab.lineEnding,
      isPinned: tab.isPinned,
      editorScrollTop: tab.editorScrollTop,
      previewScrollTop: tab.previewScrollTop,
      cursorOffset: tab.cursorOffset,
      selectionEnd: tab.selectionEnd
    })),

  pruneEmpty: () => {
    const state = get()
    const tabs = state.tabs.filter(
      (tab) => Boolean(tab.filePath) || tab.fileContent.trim().length > 0 || tab.savedContent.trim().length > 0
    )
    if (tabs.length === state.tabs.length) return
    if (tabs.length === 0) {
      const store = get()
      store.newTab('', true)
      return
    }
    set({
      tabs,
      activeTabId: tabs.some((tab) => tab.id === state.activeTabId) ? state.activeTabId : tabs[0].id
    })
  },

  setHydrated: (value) => set({ hydrated: value })
}))

export function useActiveTab(): DocumentTab | null {
  return useTabStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId) ?? null)
}

export function useTabDirty(): boolean {
  return useTabStore((state) => {
    const active = state.tabs.find((tab) => tab.id === state.activeTabId)
    return active ? active.fileContent !== active.savedContent : false
  })
}
