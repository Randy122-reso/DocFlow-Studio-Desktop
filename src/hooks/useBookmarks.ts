import { useCallback } from 'react'
import type { RefObject } from 'react'
import { useBookmarkStore } from '../store/bookmarkStore'
import { useTabStore } from '../store/tabStore'
import { useSearchStore } from '../store/searchStore'
import { useFileStore } from '../store/fileStore'
import { useI18n } from './useI18n'
import { buildRegExp, findAll, lineColumnAt } from '../utils/searchRegex'
import { copyText } from '../utils/clipboard'
import { describeError } from '../utils/errors'

export interface BookmarksApi {
  bookmarks: number[]
  bookmarkLine: boolean
  setBookmarkLine(enabled: boolean): void
  toggleBookmark(line?: number): boolean
  goToLine(lineNumber: number): void
  goToNextBookmark(): void
  goToPrevBookmark(): void
  markAll(): number
  copyMarkedLines(): Promise<boolean>
  clearMarks(): void
}

export function useBookmarks(editorRef: RefObject<HTMLTextAreaElement | null>): BookmarksApi {
  const { t } = useI18n()
  const bookmarkStore = useBookmarkStore()
  const activeTabId = useTabStore((state) => state.activeTabId) ?? ''
  const bookmarks = bookmarkStore.bookmarks[activeTabId] ?? []

  const getCurrentLine = useCallback((): number => {
    const editor = editorRef.current
    if (!editor) return 1
    const before = editor.value.slice(0, editor.selectionStart)
    return before.split('\n').length
  }, [editorRef])

  const goToLine = useCallback(
    (lineNumber: number) => {
      const tab = useTabStore.getState().getActive()
      const editor = editorRef.current
      if (!tab || !editor || lineNumber < 1) return

      const lines = tab.fileContent.split('\n')
      const targetIndex = Math.min(lineNumber - 1, lines.length - 1)
      const lineStart = lines.slice(0, targetIndex).reduce((total, line) => total + line.length + 1, 0)
      const lineEnd = lineStart + (lines[targetIndex]?.length ?? 0)

      editor.focus()
      editor.setSelectionRange(lineStart, lineEnd)

      const computedLineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight) || 24
      const top = Math.max(0, targetIndex * computedLineHeight - editor.clientHeight / 3)
      editor.scrollTo({ top, behavior: 'smooth' })
    },
    [editorRef]
  )

  const toggleBookmark = useCallback(
    (line?: number): boolean => {
      if (!activeTabId) return false
      const lineToToggle = line ?? getCurrentLine()
      const result = bookmarkStore.toggleBookmark(activeTabId, lineToToggle)
      return result
    },
    [activeTabId, bookmarkStore, getCurrentLine]
  )

  const goToNextBookmark = useCallback(() => {
    if (!activeTabId) return
    const curLine = getCurrentLine()
    const next = bookmarkStore.getNextBookmark(activeTabId, curLine)
    if (next !== null) {
      goToLine(next)
    } else {
      useFileStore.getState().showToast('info', t('find:noBookmarks'), '')
    }
  }, [activeTabId, bookmarkStore, getCurrentLine, goToLine, t])

  const goToPrevBookmark = useCallback(() => {
    if (!activeTabId) return
    const curLine = getCurrentLine()
    const prev = bookmarkStore.getPrevBookmark(activeTabId, curLine)
    if (prev !== null) {
      goToLine(prev)
    } else {
      useFileStore.getState().showToast('info', t('find:noBookmarks'), '')
    }
  }, [activeTabId, bookmarkStore, getCurrentLine, goToLine, t])

  const clearMarks = useCallback(() => {
    if (!activeTabId) return
    bookmarkStore.clearBookmarks(activeTabId)
    useSearchStore.getState().clearAllResults()
  }, [activeTabId, bookmarkStore])

  const markAll = useCallback((): number => {
    const search = useSearchStore.getState()
    const tab = useTabStore.getState().getActive()
    if (!tab || !search.query) return 0

    try {
      const regex = buildRegExp(search.query, { ...search.options, inSelection: false })
      const matches = findAll(tab.fileContent, regex)
      if (matches.length === 0) {
        useFileStore.getState().showToast('info', t('find:noResults'), '')
        return 0
      }

      const lineNumbers = matches.map((m) => lineColumnAt(tab.fileContent, m.index).lineNumber)
      const uniqueLines = Array.from(new Set(lineNumbers)).sort((a, b) => a - b)

      if (bookmarkStore.bookmarkLine) {
        bookmarkStore.addBookmarks(tab.id, uniqueLines)
      }

      useFileStore
        .getState()
        .showToast(
          'success',
          t('find:markedResult', { matches: matches.length, lines: uniqueLines.length }),
          bookmarkStore.bookmarkLine ? `${uniqueLines.length} ${t('find:bookmarks')}` : ''
        )

      return matches.length
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast('error', t('find:invalidRegex'), described.detail || described.message)
      return 0
    }
  }, [bookmarkStore, t])

  const copyMarkedLines = useCallback(async (): Promise<boolean> => {
    const tab = useTabStore.getState().getActive()
    if (!tab || !activeTabId) return false

    const markedLines = bookmarkStore.getBookmarks(activeTabId)
    if (markedLines.length === 0) {
      useFileStore.getState().showToast('info', t('find:noMarkedLines'), '')
      return false
    }

    const lines = tab.fileContent.split('\n')
    const extracted = markedLines
      .filter((lineNum) => lineNum >= 1 && lineNum <= lines.length)
      .map((lineNum) => lines[lineNum - 1])
      .join('\n')

    const ok = await copyText(extracted)
    if (ok) {
      useFileStore
        .getState()
        .showToast('success', t('find:copiedMarked', { count: markedLines.length }), `${markedLines.length} ${t('find:line')}`)
    }
    return ok
  }, [activeTabId, bookmarkStore, t])

  return {
    bookmarks,
    bookmarkLine: bookmarkStore.bookmarkLine,
    setBookmarkLine: bookmarkStore.setBookmarkLine,
    toggleBookmark,
    goToLine,
    goToNextBookmark,
    goToPrevBookmark,
    markAll,
    copyMarkedLines,
    clearMarks
  }
}
