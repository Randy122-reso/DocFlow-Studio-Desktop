import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  computeDocumentStats,
  formatBytes,
  formatRelativeTime
} from '../../src/utils/documentStats'

describe('computeDocumentStats', () => {
  it('counts a simple sentence', () => {
    const stats = computeDocumentStats('Hello world.')
    expect(stats.words).toBe(2)
    expect(stats.characters).toBe(12)
    expect(stats.charactersNoSpaces).toBe(11)
    expect(stats.sentences).toBe(1)
    expect(stats.paragraphs).toBe(1)
    expect(stats.readingTimeMinutes).toBe(1)
  })

  it('excludes fenced code blocks from prose counts', () => {
    const markdown = ['```js', 'const ignoredWord = 1', '```', '', 'Real words here.'].join('\n')
    const stats = computeDocumentStats(markdown)
    expect(stats.words).toBe(3)
    expect(stats.codeBlocks).toBe(1)
    expect(stats.paragraphs).toBe(1)
  })

  it('does not count headings as paragraphs', () => {
    const stats = computeDocumentStats('# Heading\n\nBody text.')
    expect(stats.paragraphs).toBe(1)
    expect(stats.headings).toBe(1)
  })

  it('counts links and images', () => {
    const stats = computeDocumentStats(
      'See [the docs](https://example.com) and ![diagram](diagram.png).'
    )
    expect(stats.links).toBe(1)
    expect(stats.images).toBe(1)
  })

  it('counts every heading level', () => {
    const stats = computeDocumentStats('# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six')
    expect(stats.headings).toBe(6)
  })

  it('rounds reading time up to whole minutes', () => {
    const stats = computeDocumentStats(Array.from({ length: 401 }, () => 'word').join(' '))
    expect(stats.readingTimeMinutes).toBe(3)
  })

  it('handles empty input', () => {
    const stats = computeDocumentStats('')
    expect(stats.words).toBe(0)
    expect(stats.sentences).toBe(0)
    expect(stats.paragraphs).toBe(0)
    expect(stats.readingTimeMinutes).toBe(1)
  })
})

describe('formatBytes', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.50 MB')
  })
})

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('describes recent timestamps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'))
    const now = Date.now()
    expect(formatRelativeTime(now - 30_000)).toBe('just now')
    expect(formatRelativeTime(now - 5 * 60_000)).toBe('5 min ago')
    expect(formatRelativeTime(now - 3 * 60 * 60_000)).toBe('3 h ago')
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60_000)).toBe('2 d ago')
  })
})
