import { describe, it, expect } from 'vitest'
import {
  bookmarkLinesToRanges,
  searchMatchesToRanges,
  buildSegments
} from '../../src/utils/highlightRanges'

// ── bookmarkLinesToRanges ─────────────────────────────────────────────────────

describe('bookmarkLinesToRanges', () => {
  it('returns empty array when no bookmarks', () => {
    expect(bookmarkLinesToRanges('hello\nworld', [])).toEqual([])
  })

  it('converts line 1 to range [0, 6) for "hello\n"', () => {
    const ranges = bookmarkLinesToRanges('hello\nworld', [1])
    expect(ranges).toHaveLength(1)
    expect(ranges[0].start).toBe(0)
    expect(ranges[0].end).toBe(6) // 'hello\n' = 6 chars
    expect(ranges[0].kind).toBe('bookmark-line')
  })

  it('converts line 2 correctly', () => {
    const content = 'hello\nworld\nfoo'
    const ranges = bookmarkLinesToRanges(content, [2])
    expect(ranges[0].start).toBe(6) // after 'hello\n'
    expect(ranges[0].end).toBe(12) // 'world\n' = 6 chars → offset 12
  })

  it('handles last line without trailing newline', () => {
    const content = 'hello\nworld'
    const ranges = bookmarkLinesToRanges(content, [2])
    expect(ranges[0].start).toBe(6)
    expect(ranges[0].end).toBe(11) // content.length
  })

  it('handles multiple bookmarks', () => {
    const content = 'a\nb\nc'
    const ranges = bookmarkLinesToRanges(content, [1, 3])
    expect(ranges).toHaveLength(2)
    expect(ranges[0]).toMatchObject({ start: 0, end: 2, kind: 'bookmark-line' })
    expect(ranges[1]).toMatchObject({ start: 4, end: 5, kind: 'bookmark-line' })
  })

  it('ignores out-of-range line numbers', () => {
    const ranges = bookmarkLinesToRanges('hello', [0, 99])
    expect(ranges).toHaveLength(0)
  })
})

// ── searchMatchesToRanges ─────────────────────────────────────────────────────

describe('searchMatchesToRanges', () => {
  it('marks all matches as search when no current match', () => {
    const ranges = searchMatchesToRanges(
      [{ index: 0, length: 3 }, { index: 10, length: 3 }],
      null,
      null
    )
    expect(ranges[0].kind).toBe('search')
    expect(ranges[1].kind).toBe('search')
  })

  it('marks the matching offset+length as current', () => {
    const ranges = searchMatchesToRanges(
      [{ index: 0, length: 3 }, { index: 10, length: 3 }],
      10,
      3
    )
    expect(ranges[0].kind).toBe('search')
    expect(ranges[1].kind).toBe('current')
  })

  it('returns empty for empty matches', () => {
    expect(searchMatchesToRanges([], 0, 3)).toEqual([])
  })
})

// ── buildSegments ─────────────────────────────────────────────────────────────

describe('buildSegments', () => {
  it('returns single plain segment when no ranges', () => {
    const segs = buildSegments('hello world', [])
    expect(segs).toHaveLength(1)
    expect(segs[0]).toEqual({ text: 'hello world', kind: 'plain' })
  })

  it('splits text around a search range', () => {
    // 'hello world' — mark 'world' (index 6, length 5)
    const segs = buildSegments('hello world', [
      { start: 6, end: 11, kind: 'search' }
    ])
    const texts = segs.map((s) => s.text)
    expect(texts).toContain('hello ')
    expect(texts).toContain('world')
    const searchSeg = segs.find((s) => s.kind === 'search')
    expect(searchSeg?.text).toBe('world')
  })

  it('current overrides search when overlapping', () => {
    const segs = buildSegments('hello', [
      { start: 0, end: 5, kind: 'search' },
      { start: 0, end: 5, kind: 'current' }
    ])
    expect(segs.every((s) => s.kind === 'current')).toBe(true)
  })

  it('search overrides bookmark-line', () => {
    const segs = buildSegments('hello', [
      { start: 0, end: 5, kind: 'bookmark-line' },
      { start: 0, end: 5, kind: 'search' }
    ])
    expect(segs.every((s) => s.kind === 'search')).toBe(true)
  })

  it('bookmark-line segment appears for non-search parts', () => {
    // Line 'hello\n' bookmarked; 'lo' is a search match
    const segs = buildSegments('hello\n', [
      { start: 0, end: 6, kind: 'bookmark-line' },
      { start: 3, end: 5, kind: 'search' }
    ])
    const bmSeg = segs.filter((s) => s.kind === 'bookmark-line')
    const searchSeg = segs.filter((s) => s.kind === 'search')
    expect(bmSeg.length).toBeGreaterThan(0)
    expect(searchSeg.length).toBeGreaterThan(0)
    // The 'lo' part must be search
    expect(searchSeg.map((s) => s.text).join('')).toBe('lo')
  })

  it('handles adjacent ranges without duplicating text', () => {
    const text = 'abcdef'
    const segs = buildSegments(text, [
      { start: 0, end: 3, kind: 'search' },
      { start: 3, end: 6, kind: 'current' }
    ])
    expect(segs.map((s) => s.text).join('')).toBe('abcdef')
  })
})
