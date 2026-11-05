import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent
} from 'react'
import {
  Bookmark,
  BookmarkX,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react'
import { useContextMenu } from '../hooks/useContextMenu'
import { useBookmarks } from '../hooks/useBookmarks'
import { useI18n } from '../hooks/useI18n'
import { useSearchStore } from '../store/searchStore'
import { useBookmarkStore } from '../store/bookmarkStore'
import { useTabStore } from '../store/tabStore'
import { buildRegExp, findAll } from '../utils/searchRegex'
import {
  bookmarkLinesToRanges,
  searchMatchesToRanges,
  buildSegments,
  type TextSegment
} from '../utils/highlightRanges'
import type { FontFamily, FontSize } from '../../electron/types/ipc'

interface DocumentEditorProps {
  value: string
  onChange(value: string): void
  onCursorChange(position: { line: number; column: number; selection: number }): void
  fontSize: FontSize
  fontFamily: FontFamily
}

// Stable empty array — avoids creating a new reference every render when
// there are no bookmarks, which would trigger Zustand's snapshot loop check.
const EMPTY_LINES: number[] = []

// ── Backdrop Segment Renderer ────────────────────────────────────────────────

function SegmentSpan({ seg }: { seg: TextSegment }) {
  if (seg.kind === 'plain') {
    // Use dangerouslySetInnerHTML-free approach: just a span
    return <span>{seg.text}</span>
  }
  return <mark className={`hl-${seg.kind}`}>{seg.text}</mark>
}

// ── Main Component ───────────────────────────────────────────────────────────

export const DocumentEditor = forwardRef<HTMLTextAreaElement, DocumentEditorProps>(function DocumentEditor(
  { value, onChange, onCursorChange, fontSize, fontFamily },
  ref
) {
  const { t } = useI18n()
  const { handleContextMenu } = useContextMenu()
  const internalRef = useRef<HTMLTextAreaElement | null>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)
  const [currentLine, setCurrentLine] = useState(1)
  const [showBookmarkList, setShowBookmarkList] = useState(false)

  // Search & bookmark state (use scalar selectors to avoid object-reference churn)
  const searchQuery = useSearchStore((s) => s.query)
  const searchMatchCase = useSearchStore((s) => s.options.matchCase)
  const searchMode = useSearchStore((s) => s.options.mode)
  const searchWholeWord = useSearchStore((s) => s.options.matchWholeWord)
  const searchDotNewline = useSearchStore((s) => s.options.dotMatchesNewline)
  const isSearchOpen = useSearchStore((s) => s.isOpen)
  const lastMatchIndex = useSearchStore((s) => s.lastMatch?.index ?? null)
  const lastMatchLength = useSearchStore((s) => s.lastMatch?.length ?? null)
  const activeTabId = useTabStore((s) => s.activeTabId) ?? ''
  // Use a stable selector: return the stored array or undefined, then fall back
  // to a module-level constant to avoid a new [] reference every render.
  const bookmarkLineNums = useBookmarkStore((s) => s.bookmarks[activeTabId]) ?? EMPTY_LINES

  const {
    bookmarks,
    toggleBookmark,
    goToLine,
    goToNextBookmark,
    goToPrevBookmark,
    copyMarkedLines,
    clearMarks
  } = useBookmarks(internalRef)

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      internalRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    },
    [ref]
  )

  // ── Resize observer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!internalRef.current || typeof ResizeObserver === 'undefined') return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height)
      }
    })
    resizeObserver.observe(internalRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // ── Popover outside-click ────────────────────────────────────────────────────
  useEffect(() => {
    if (!showBookmarkList) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowBookmarkList(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showBookmarkList])

  // ── Cursor tracking ──────────────────────────────────────────────────────────
  const updateCursor = (element: HTMLTextAreaElement) => {
    const before = element.value.slice(0, element.selectionStart)
    const lines = before.split('\n')
    const lineNum = lines.length
    setCurrentLine(lineNum)
    onCursorChange({
      line: lineNum,
      column: (lines[lines.length - 1]?.length ?? 0) + 1,
      selection: Math.abs(element.selectionEnd - element.selectionStart)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const element = event.currentTarget
    element.setRangeText('  ', element.selectionStart, element.selectionEnd, 'end')
    onChange(element.value)
    updateCursor(element)
  }

  const handleScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget
    const st = target.scrollTop
    setScrollTop(st)
    if (gutterRef.current) gutterRef.current.scrollTop = st
    if (backdropRef.current) backdropRef.current.scrollTop = st
  }

  // ── Virtual gutter ───────────────────────────────────────────────────────────
  const allLines = value.split('\n')
  const lineCount = allLines.length
  const lineHeight = fontSize === 'sm' ? 21.875 : fontSize === 'lg' ? 28 : 24.5

  const visibleStart = Math.max(1, Math.floor(scrollTop / lineHeight) - 5)
  const visibleEnd = Math.min(lineCount, Math.ceil((scrollTop + viewportHeight) / lineHeight) + 10)

  const topSpacer = Math.max(0, (visibleStart - 1) * lineHeight)
  const bottomSpacer = Math.max(0, (lineCount - visibleEnd) * lineHeight)

  const visibleLines: number[] = []
  for (let i = visibleStart; i <= visibleEnd; i++) {
    visibleLines.push(i)
  }

  // ── Highlight segments (memoised) ────────────────────────────────────────────
  const highlightSegments = useMemo(() => {
    const allRanges = []

    // 1. Bookmark-line ranges
    const bmRanges = bookmarkLinesToRanges(value, bookmarkLineNums)
    allRanges.push(...bmRanges)

    // 2. Search match ranges (only when search bar is open and query exists)
    if (isSearchOpen && searchQuery) {
      try {
        const regex = buildRegExp(searchQuery, {
          matchCase: searchMatchCase,
          mode: searchMode,
          matchWholeWord: searchWholeWord,
          dotMatchesNewline: searchDotNewline,
          inSelection: false
        })
        const matches = findAll(value, regex)
        const currentIdx = lastMatchIndex
        const currentLen = lastMatchLength
        const searchRanges = searchMatchesToRanges(
          matches.map((m) => ({ index: m.index, length: m.length })),
          currentIdx,
          currentLen
        )
        allRanges.push(...searchRanges)
      } catch {
        // Invalid regex — no search highlights
      }
    }

    if (allRanges.length === 0) return null
    return buildSegments(value, allRanges)
  }, [value, bookmarkLineNums, isSearchOpen, searchQuery, searchMatchCase, searchMode, searchWholeWord, searchDotNewline, lastMatchIndex, lastMatchLength])

  const showBackdrop = highlightSegments !== null && highlightSegments.length > 0

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="editor-pane">
      <div className="pane-header">
        <div className="pane-header-left">
          <span className="pane-label">Markdown</span>
          <span className="pane-hint">{lineCount} lines</span>
        </div>

        <div className="bookmark-toolbar">
          <button
            type="button"
            className="icon-button"
            title={t('find:toggleBookmark')}
            onClick={() => toggleBookmark(currentLine)}
          >
            <Bookmark
              size={13}
              fill={bookmarks.includes(currentLine) ? 'currentColor' : 'none'}
              color={bookmarks.includes(currentLine) ? 'var(--accent)' : 'currentColor'}
            />
          </button>

          {bookmarks.length > 0 && (
            <>
              <button
                type="button"
                className="bookmark-badge-btn"
                title={`${bookmarks.length} ${t('find:bookmarks')} — Click to view list`}
                onClick={() => setShowBookmarkList((v) => !v)}
              >
                <Bookmark size={11} fill="currentColor" /> {bookmarks.length}
              </button>

              <button
                type="button"
                className="icon-button"
                title={t('find:prevBookmark')}
                onClick={() => goToPrevBookmark()}
              >
                <ChevronUp size={13} />
              </button>

              <button
                type="button"
                className="icon-button"
                title={t('find:nextBookmark')}
                onClick={() => goToNextBookmark()}
              >
                <ChevronDown size={13} />
              </button>

              <button
                type="button"
                className="icon-button"
                title={t('find:copyMarked')}
                onClick={() => void copyMarkedLines()}
              >
                <Copy size={13} />
              </button>

              <button
                type="button"
                className="icon-button"
                title={t('find:clearAllBookmarks')}
                onClick={() => clearMarks()}
              >
                <BookmarkX size={13} />
              </button>
            </>
          )}

          {showBookmarkList && (
            <div className="bookmark-popover" ref={popoverRef}>
              <div className="bookmark-popover-head">
                <strong>
                  {t('find:bookmarks')} ({bookmarks.length})
                </strong>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => clearMarks()}
                  title={t('find:clearAllBookmarks')}
                >
                  <BookmarkX size={13} />
                </button>
              </div>
              <div className="bookmark-popover-list">
                {bookmarks.map((lineNum) => {
                  const lineContent = allLines[lineNum - 1] ?? ''
                  return (
                    <button
                      key={lineNum}
                      type="button"
                      className="bookmark-popover-item"
                      onClick={() => {
                        goToLine(lineNum)
                        setShowBookmarkList(false)
                      }}
                    >
                      <span className="bookmark-popover-line">Ln {lineNum}</span>
                      <span className="bookmark-popover-preview">
                        {lineContent.trim() || '(empty line)'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="editor-container">
        {/* Line number gutter */}
        <div ref={gutterRef} className={`editor-gutter size-${fontSize}`}>
          <div style={{ height: topSpacer }} />
          {visibleLines.map((lineNum) => {
            const isBookmarked = bookmarks.includes(lineNum)
            const isCurrent = currentLine === lineNum
            return (
              <div
                key={lineNum}
                className={`gutter-line ${isBookmarked ? 'is-bookmarked' : ''} ${
                  isCurrent ? 'is-current' : ''
                }`}
                style={{ height: lineHeight }}
                onClick={() => toggleBookmark(lineNum)}
                title={`Line ${lineNum}${
                  isBookmarked ? ' (Bookmarked - click to remove)' : ' (Click to bookmark)'
                }`}
              >
                <span className="gutter-bookmark">
                  {isBookmarked ? (
                    <Bookmark size={10} fill="currentColor" />
                  ) : (
                    <span className="bookmark-hover-dot" />
                  )}
                </span>
                <span className="gutter-number">{lineNum}</span>
              </div>
            )
          })}
          <div style={{ height: bottomSpacer }} />
        </div>

        {/* Highlight backdrop — sits behind the transparent textarea */}
        {showBackdrop && (
          <div
            ref={backdropRef}
            className={`editor-backdrop font-${fontFamily} size-${fontSize}`}
            aria-hidden="true"
          >
            {highlightSegments!.map((seg, i) => (
              <SegmentSpan key={i} seg={seg} />
            ))}
          </div>
        )}

        {/* Actual editor textarea */}
        <textarea
          ref={setRefs}
          className={`editor-textarea font-${fontFamily} size-${fontSize}${showBackdrop ? ' has-backdrop' : ''}`}
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            updateCursor(event.target)
          }}
          onScroll={handleScroll}
          onSelect={(event) => updateCursor(event.currentTarget)}
          onKeyUp={(event) => updateCursor(event.currentTarget)}
          onClick={(event) => updateCursor(event.currentTarget)}
          onKeyDown={handleKeyDown}
          onContextMenu={(e) => handleContextMenu(e, 'editor')}
          spellCheck
          placeholder="Start writing Markdown…"
          aria-label="Markdown editor"
        />
      </div>
    </section>
  )
})
