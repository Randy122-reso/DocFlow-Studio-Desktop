/**
 * Utilities for computing character-offset ranges used by the editor
 * highlight backdrop. Pure functions — no side effects, easy to test.
 */

export interface HighlightRange {
  start: number
  end: number
  kind: 'search' | 'current' | 'bookmark-line'
}

export interface MatchRange {
  index: number
  length: number
}

/**
 * Convert an array of line numbers (1-based) to character-offset ranges
 * that span each entire line (including the trailing newline so the
 * highlight covers the full line width in the backdrop).
 */
export function bookmarkLinesToRanges(content: string, bookmarkedLines: number[]): HighlightRange[] {
  if (bookmarkedLines.length === 0) return []

  const lines = content.split('\n')
  const result: HighlightRange[] = []

  // Build cumulative offsets once
  const lineOffsets: number[] = new Array(lines.length)
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    lineOffsets[i] = offset
    offset += lines[i].length + 1 // +1 for '\n'
  }

  for (const lineNum of bookmarkedLines) {
    const idx = lineNum - 1
    if (idx < 0 || idx >= lines.length) continue
    const start = lineOffsets[idx]
    // End covers the full line; don't go past content length
    const end = Math.min(start + lines[idx].length + 1, content.length)
    result.push({ start, end, kind: 'bookmark-line' })
  }

  return result
}

/**
 * Convert raw match ranges to HighlightRange objects, flagging the
 * currently-active match (by character offset) as 'current'.
 */
export function searchMatchesToRanges(
  matches: MatchRange[],
  currentMatchIndex: number | null,
  currentMatchLength: number | null
): HighlightRange[] {
  return matches.map((m) => {
    const isCurrent =
      currentMatchIndex !== null &&
      currentMatchLength !== null &&
      m.index === currentMatchIndex &&
      m.length === currentMatchLength
    return {
      start: m.index,
      end: m.index + m.length,
      kind: isCurrent ? 'current' : 'search'
    }
  })
}

/**
 * Build an array of React-renderable segments from plain text and an array
 * of highlight ranges. Segments are either plain strings or tagged objects.
 *
 * Ranges may overlap; `bookmark-line` is applied first (background), then
 * `search`/`current` on top.  For simplicity we merge all ranges and emit
 * segments in one pass by sorting and slicing.
 */
export interface TextSegment {
  text: string
  kind: 'plain' | 'search' | 'current' | 'bookmark-line'
}

export function buildSegments(text: string, ranges: HighlightRange[]): TextSegment[] {
  if (ranges.length === 0) return [{ text, kind: 'plain' }]

  // Collect all boundary points, deduplicate and sort
  const points = new Set<number>([0, text.length])
  for (const r of ranges) {
    if (r.start >= 0 && r.start <= text.length) points.add(r.start)
    if (r.end >= 0 && r.end <= text.length) points.add(r.end)
  }
  const sorted = Array.from(points).sort((a, b) => a - b)

  const segments: TextSegment[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i]
    const segEnd = sorted[i + 1]
    if (segStart >= segEnd) continue
    const segText = text.slice(segStart, segEnd)

    // Determine kind: priority current > search > bookmark-line > plain
    let kind: TextSegment['kind'] = 'plain'
    let done = false
    for (const r of ranges) {
      if (done) break
      if (r.start <= segStart && r.end >= segEnd) {
        if (r.kind === 'current') {
          kind = 'current'
          done = true
        } else if (r.kind === 'search' && kind !== 'search' && kind !== 'current') {
          kind = 'search'
        } else if (r.kind === 'bookmark-line' && kind === 'plain') {
          kind = 'bookmark-line'
        }
      }
    }

    segments.push({ text: segText, kind })
  }

  return segments
}
