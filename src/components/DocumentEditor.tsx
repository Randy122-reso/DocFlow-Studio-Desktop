import {
  forwardRef,
  memo,
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

/**
 * Fallback line height in px used before the real computed value is measured.
 * Kept in sync with `--editor-line-height` (1.75) × base font-size (14px)
 * in index.css. Import this wherever a lineHeight fallback is needed so the
 * gutter, the textarea and the scroll-sync maths never drift apart.
 */
export const DEFAULT_EDITOR_LINE_HEIGHT_PX = 24.5

// ── Backdrop Segment Renderer ────────────────────────────────────────────────

function SegmentSpan({ seg }: { seg: TextSegment }) {
  if (seg.kind === 'plain') {
    // Use dangerouslySetInnerHTML-free approach: just a span
    return <span>{seg.text}</span>
  }
  return <mark className={`hl-${seg.kind}`}>{seg.text}</mark>
}

// ── Gutter Renderer ──────────────────────────────────────────────────────────

interface EditorGutterProps {
  lineNumbers: number[]
  lineHeight: number
  bookmarks: number[]
  currentLine: number
  onToggleBookmark(line: number): void
}

/**
 * The gutter renders every line number exactly once per document. Scroll
 * positioning is handled imperatively by DocumentEditor via `transform`, so
 * scrolling never re-renders this component. React.memo keeps typing cheap
 * because the component only re-renders when lines, bookmarks or the active
 * line actually change.
 */
const EditorGutter = memo(
  forwardRef<HTMLDivElement, EditorGutterProps>(function EditorGutter(
    { lineNumbers, lineHeight, bookmarks, currentLine, onToggleBookmark },
    ref
  ) {
    const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks])

    return (
      <div ref={ref} className="editor-gutter-inner">
        {lineNumbers.map((lineNum) => {
          const isBookmarked = bookmarkSet.has(lineNum)
          const isCurrent = currentLine === lineNum
          return (
            <div
              key={lineNum}
              className={`gutter-line ${isBookmarked ? 'is-bookmarked' : ''} ${
                isCurrent ? 'is-current' : ''
              }`}
              style={{ height: lineHeight }}
              onClick={() => onToggleBookmark(lineNum)}
              title={`Line ${lineNum}${
                isBookmarked ? ' (Bookmarked - click to remove)' : ' (Click to bookmark)'
              }`}
            >
              <span className="gutter-bookmark">
                {isBookmarked ? <Bookmark size={10} fill="currentColor" /> : <span className="bookmark-hover-dot" />}
              </span>
              <span className="gutter-number">{lineNum}</span>
            </div>
          )
        })}
      </div>
    )
  })
)

// ── Main Component ───────────────────────────────────────────────────────────

export const DocumentEditor = forwardRef<HTMLTextAreaElement, DocumentEditorProps>(function DocumentEditor(
  { value, onChange, onCursorChange, fontSize, fontFamily },
  ref
) {
  const { t } = useI18n()
  const { handleContextMenu } = useContextMenu()
  const internalRef = useRef<HTMLTextAreaElement | null>(null)
  const gutterInnerRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [lineHeightPx, setLineHeightPx] = useState(DEFAULT_EDITOR_LINE_HEIGHT_PX)
  const [currentLine, setCurrentLine] = useState(1)
  const [showBookmarkList, setShowBookmarkList] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

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
    const el = internalRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const computed = parseFloat(window.getComputedStyle(el).lineHeight)
      if (Number.isFinite(computed) && computed > 0) setLineHeightPx(computed)
    }
    measure()
    const resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [fontSize])

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

  /**
   * Imperative scroll synchronisation — deliberately no React state here.
   * Updating state on every scroll event re-renders the whole editor on each
   * frame, which is the main cause of stuttering (see SOLUSI.md #1).
   */
  const handleScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const scrollTop = event.currentTarget.scrollTop
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = `translateY(-${scrollTop}px)`
    }
    if (backdropRef.current) backdropRef.current.scrollTop = scrollTop
  }

  // ── Line data (content only) ─────────────────────────────────────────────────
  const allLines = useMemo(() => value.split('\n'), [value])
  const lineCount = allLines.length
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1),
    [lineCount]
  )
  const lineHeight = lineHeightPx

  // ── Debounce search query for highlight rendering ───────────────────────────
  useEffect(() => {
    if (!isSearchOpen) {
      setDebouncedSearchQuery('')
      return
    }
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, isSearchOpen])

  // ── Highlight segments (memoised) ────────────────────────────────────────────
  const highlightSegments = useMemo(() => {
    const allRanges = []

    // 1. Bookmark-line ranges
    const bmRanges = bookmarkLinesToRanges(value, bookmarkLineNums)
    allRanges.push(...bmRanges)

    // 2. Search match ranges (only when search bar is open and query exists)
    if (isSearchOpen && debouncedSearchQuery) {
      try {
        const regex = buildRegExp(debouncedSearchQuery, {
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
  }, [value, bookmarkLineNums, isSearchOpen, debouncedSearchQuery, searchMatchCase, searchMode, searchWholeWord, searchDotNewline, lastMatchIndex, lastMatchLength])

  const showBackdrop = highlightSegments !== null && highlightSegments.length > 0

  // Re-align the gutter/backdrop after a font change or when the backdrop
  // mounts while the editor is already scrolled.
  useEffect(() => {
    const editor = internalRef.current
    if (!editor) return
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = `translateY(-${editor.scrollTop}px)`
    }
    if (backdropRef.current) backdropRef.current.scrollTop = editor.scrollTop
  }, [showBackdrop, fontSize, fontFamily, lineHeight])

  const handleGutterToggle = useCallback(
    (line: number) => {
      toggleBookmark(line)
    },
    [toggleBookmark]
  )

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
        {/* Line number gutter — every line is rendered once and moved
            imperatively with transform while scrolling. */}
        <div className={`editor-gutter size-${fontSize}`}>
          <EditorGutter
            ref={gutterInnerRef}
            lineNumbers={lineNumbers}
            lineHeight={lineHeight}
            bookmarks={bookmarkLineNums}
            currentLine={currentLine}
            onToggleBookmark={handleGutterToggle}
          />
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
