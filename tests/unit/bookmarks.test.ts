import { describe, expect, it, beforeEach } from 'vitest'
import { useBookmarkStore } from '../../src/store/bookmarkStore'

describe('BookmarkStore', () => {
  const tabId = 'tab-test-1'

  beforeEach(() => {
    useBookmarkStore.getState().clearAllTabsBookmarks()
  })

  it('toggles bookmarks and keeps them sorted', () => {
    const store = useBookmarkStore.getState()
    expect(store.toggleBookmark(tabId, 10)).toBe(true)
    expect(store.getBookmarks(tabId)).toEqual([10])

    expect(store.toggleBookmark(tabId, 5)).toBe(true)
    expect(store.getBookmarks(tabId)).toEqual([5, 10])

    expect(store.toggleBookmark(tabId, 10)).toBe(false)
    expect(store.getBookmarks(tabId)).toEqual([5])
  })

  it('adds multiple bookmarks without duplicates', () => {
    const store = useBookmarkStore.getState()
    store.addBookmarks(tabId, [4, 12, 4, 8, 20])
    expect(store.getBookmarks(tabId)).toEqual([4, 8, 12, 20])
  })

  it('navigates to next bookmark with wrap-around', () => {
    const store = useBookmarkStore.getState()
    store.addBookmarks(tabId, [10, 25, 50])

    expect(store.getNextBookmark(tabId, 5)).toBe(10)
    expect(store.getNextBookmark(tabId, 10)).toBe(25)
    expect(store.getNextBookmark(tabId, 30)).toBe(50)
    // Wrap around to first
    expect(store.getNextBookmark(tabId, 55)).toBe(10)
  })

  it('navigates to previous bookmark with wrap-around', () => {
    const store = useBookmarkStore.getState()
    store.addBookmarks(tabId, [10, 25, 50])

    expect(store.getPrevBookmark(tabId, 60)).toBe(50)
    expect(store.getPrevBookmark(tabId, 50)).toBe(25)
    expect(store.getPrevBookmark(tabId, 25)).toBe(10)
    // Wrap around to last
    expect(store.getPrevBookmark(tabId, 5)).toBe(50)
  })

  it('clears bookmarks for a specific tab', () => {
    const store = useBookmarkStore.getState()
    store.addBookmarks(tabId, [1, 2, 3])
    store.addBookmarks('other-tab', [5, 6])

    store.clearBookmarks(tabId)
    expect(store.getBookmarks(tabId)).toEqual([])
    expect(store.getBookmarks('other-tab')).toEqual([5, 6])
  })

  it('toggles bookmarkLine option', () => {
    const store = useBookmarkStore.getState()
    expect(store.bookmarkLine).toBe(true)
    store.setBookmarkLine(false)
    expect(useBookmarkStore.getState().bookmarkLine).toBe(false)
  })
})
