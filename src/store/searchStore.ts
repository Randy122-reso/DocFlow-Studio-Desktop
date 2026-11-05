import { create } from 'zustand'
import type { FindFileChange, FindOptions, FindResult } from '../../electron/types/ipc'

export const FIND_HISTORY_MAX = 20
export const FIND_RESULTS_MAX = 10_000

export const DEFAULT_FIND_OPTIONS: FindOptions = {
  matchCase: false,
  matchWholeWord: false,
  mode: 'normal',
  dotMatchesNewline: false,
  wrapAround: true,
  inSelection: false,
  backward: false,
  extendedUnicode: true
}

export interface FindMatch {
  tabId: string
  index: number
  length: number
}

interface SearchStore {
  isOpen: boolean
  showReplace: boolean
  query: string
  replaceWith: string
  options: FindOptions
  history: string[]
  lastMatch: FindMatch | null
  selectionRange: { start: number; end: number } | null
  focusToken: number

  allResults: FindResult[]
  allResultsOpen: boolean
  allResultsTruncated: boolean

  inFilesOpen: boolean
  inFilesRoot: string
  inFilesGlob: string
  inFilesResults: FindResult[]
  inFilesTruncated: boolean
  inFilesScanned: number
  inFilesBusy: boolean
  inFilesError: string | null

  replacePreview: FindFileChange[] | null
  replaceBusy: boolean

  openFind(showReplace?: boolean): void
  openFindInFiles(): void
  closeFind(): void
  closeFindInFiles(): void
  setQuery(query: string): void
  setReplaceWith(value: string): void
  setOptions(patch: Partial<FindOptions>): void
  setMode(mode: FindOptions['mode']): void
  setLastMatch(match: FindMatch | null): void
  setSelectionRange(range: { start: number; end: number } | null): void
  addHistory(query: string): void
  hydrate(history: string[], options: FindOptions): void

  setAllResults(results: FindResult[], truncated: boolean): void
  setAllResultsOpen(open: boolean): void
  clearAllResults(): void

  setInFilesRoot(root: string): void
  setInFilesGlob(glob: string): void
  setInFilesResults(input: {
    results: FindResult[]
    truncated: boolean
    filesScanned: number
  }): void
  setInFilesBusy(busy: boolean): void
  setInFilesError(error: string | null): void
  setReplacePreview(changes: FindFileChange[] | null): void
  setReplaceBusy(busy: boolean): void
  resetInFiles(): void
}

function withoutResultState() {
  return {
    lastMatch: null,
    selectionRange: null
  }
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  isOpen: false,
  showReplace: false,
  query: '',
  replaceWith: '',
  options: { ...DEFAULT_FIND_OPTIONS },
  history: [],
  lastMatch: null,
  selectionRange: null,
  focusToken: 0,

  allResults: [],
  allResultsOpen: false,
  allResultsTruncated: false,

  inFilesOpen: false,
  inFilesRoot: '',
  inFilesGlob: '**/*.{md,markdown,txt}',
  inFilesResults: [],
  inFilesTruncated: false,
  inFilesScanned: 0,
  inFilesBusy: false,
  inFilesError: null,

  replacePreview: null,
  replaceBusy: false,

  openFind: (showReplace = false) =>
    set((state) => ({
      isOpen: true,
      showReplace: showReplace || state.showReplace,
      selectionRange: null,
      focusToken: state.focusToken + 1
    })),

  openFindInFiles: () =>
    set((state) => ({
      inFilesOpen: true,
      focusToken: state.focusToken + 1
    })),

  closeFind: () => set({ isOpen: false, lastMatch: null, selectionRange: null }),

  closeFindInFiles: () => set({ inFilesOpen: false }),

  setQuery: (query) => set({ query, ...withoutResultState() }),

  setReplaceWith: (replaceWith) => set({ replaceWith }),

  setOptions: (patch) => set((state) => ({ options: { ...state.options, ...patch }, ...withoutResultState() })),

  setMode: (mode) =>
    set((state) => ({ options: { ...state.options, mode }, ...withoutResultState() })),

  setLastMatch: (lastMatch) => set({ lastMatch }),

  setSelectionRange: (selectionRange) => set({ selectionRange }),

  addHistory: (query) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const history = [trimmed, ...get().history.filter((item) => item !== trimmed)].slice(0, FIND_HISTORY_MAX)
    set({ history })
  },

  hydrate: (history, options) =>
    set({
      history: history.slice(0, FIND_HISTORY_MAX),
      options: { ...DEFAULT_FIND_OPTIONS, ...options }
    }),

  setAllResults: (allResults, allResultsTruncated) =>
    set({ allResults, allResultsTruncated, allResultsOpen: true }),

  setAllResultsOpen: (allResultsOpen) => set({ allResultsOpen }),

  clearAllResults: () => set({ allResults: [], allResultsTruncated: false, allResultsOpen: false }),

  setInFilesRoot: (inFilesRoot) => set({ inFilesRoot }),

  setInFilesGlob: (inFilesGlob) => set({ inFilesGlob }),

  setInFilesResults: ({ results, truncated, filesScanned }) =>
    set({
      inFilesResults: results,
      inFilesTruncated: truncated,
      inFilesScanned: filesScanned,
      inFilesError: null
    }),

  setInFilesBusy: (inFilesBusy) => set({ inFilesBusy }),

  setInFilesError: (inFilesError) => set({ inFilesError }),

  setReplacePreview: (replacePreview) => set({ replacePreview }),

  setReplaceBusy: (replaceBusy) => set({ replaceBusy }),

  resetInFiles: () =>
    set({
      inFilesResults: [],
      inFilesTruncated: false,
      inFilesScanned: 0,
      inFilesError: null,
      replacePreview: null
    })
}))
