import { create } from 'zustand'

export interface BookmarkStore {
  bookmarks: Record<string, number[]>
  bookmarkLine: boolean

  setBookmarkLine(enabled: boolean): void
  toggleBookmark(tabId: string, line: number): boolean
  addBookmarks(tabId: string, lines: number[]): void
  removeBookmark(tabId: string, line: number): void
  clearBookmarks(tabId: string): void
  clearAllTabsBookmarks(): void
  getBookmarks(tabId: string): number[]
  isBookmarked(tabId: string, line: number): boolean
  getNextBookmark(tabId: string, currentLine: number): number | null
  getPrevBookmark(tabId: string, currentLine: number): number | null
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: {},
  bookmarkLine: true,

  setBookmarkLine: (enabled: boolean) => set({ bookmarkLine: enabled }),

  toggleBookmark: (tabId: string, line: number): boolean => {
    if (!tabId || line < 1) return false
    const current = get().bookmarks[tabId] ?? []
    const exists = current.includes(line)
    const updated = exists ? current.filter((l) => l !== line) : [...current, line].sort((a, b) => a - b)
    set((state) => ({
      bookmarks: {
        ...state.bookmarks,
        [tabId]: updated
      }
    }))
    return !exists
  },

  addBookmarks: (tabId: string, lines: number[]) => {
    if (!tabId || lines.length === 0) return
    const current = get().bookmarks[tabId] ?? []
    const merged = Array.from(new Set([...current, ...lines])).sort((a, b) => a - b)
    set((state) => ({
      bookmarks: {
        ...state.bookmarks,
        [tabId]: merged
      }
    }))
  },

  removeBookmark: (tabId: string, line: number) => {
    if (!tabId) return
    const current = get().bookmarks[tabId] ?? []
    set((state) => ({
      bookmarks: {
        ...state.bookmarks,
        [tabId]: current.filter((l) => l !== line)
      }
    }))
  },

  clearBookmarks: (tabId: string) => {
    if (!tabId) return
    set((state) => ({
      bookmarks: {
        ...state.bookmarks,
        [tabId]: []
      }
    }))
  },

  clearAllTabsBookmarks: () => set({ bookmarks: {} }),

  getBookmarks: (tabId: string): number[] => {
    return get().bookmarks[tabId] ?? []
  },

  isBookmarked: (tabId: string, line: number): boolean => {
    return (get().bookmarks[tabId] ?? []).includes(line)
  },

  getNextBookmark: (tabId: string, currentLine: number): number | null => {
    const list = get().bookmarks[tabId] ?? []
    if (list.length === 0) return null
    const next = list.find((l) => l > currentLine)
    return next ?? list[0] ?? null
  },

  getPrevBookmark: (tabId: string, currentLine: number): number | null => {
    const list = get().bookmarks[tabId] ?? []
    if (list.length === 0) return null
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] < currentLine) return list[i]
    }
    return list[list.length - 1] ?? null
  }
}))
