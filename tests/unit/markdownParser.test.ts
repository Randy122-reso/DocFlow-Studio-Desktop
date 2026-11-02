import { describe, expect, it } from 'vitest'
import {
  extractCodeBlocks,
  parseMarkdown,
  slugify,
  stripMarkdown
} from '../../src/utils/markdownParser'

describe('slugify', () => {
  it('normalizes accents and punctuation', () => {
    expect(slugify('Héllo, Wörld!')).toBe('hello-world')
  })

  it('falls back for empty or symbol-only values', () => {
    expect(slugify('***')).toBe('section')
  })
})

describe('parseMarkdown', () => {
  it('adds unique ids to duplicate headings', () => {
    const { headings } = parseMarkdown('# Hello\n\n## Hello\n\n### Hello')
    expect(headings.map((heading) => heading.id)).toEqual(['hello', 'hello-2', 'hello-3'])
    expect(headings.map((heading) => heading.level)).toEqual([1, 2, 3])
  })

  it('removes scripts and inline event handlers', () => {
    const { html } = parseMarkdown('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
  })

  it('strips javascript urls', () => {
    const { html } = parseMarkdown('[click me](javascript:alert(1))')
    expect(html.toLowerCase()).not.toContain('javascript:')
  })

  it('marks external links as safe new-tab links', () => {
    const { html } = parseMarkdown('[site](https://example.com)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('transforms GitHub-style callouts', () => {
    const { html } = parseMarkdown('> [!WARNING]\n> Be careful')
    expect(html).toContain('class="callout callout-warning"')
    expect(html).toContain('Be careful')
  })

  it('wraps fenced code blocks with a language toolbar', () => {
    const { html } = parseMarkdown('```ts\nconst answer = 42\n```')
    expect(html).toContain('class="code-block" data-language="ts"')
    expect(html).toContain('const answer = 42')
    expect(html).toContain('data-copy-code')
  })

  it('falls back to the text language for unlabelled fences', () => {
    const { html } = parseMarkdown('```\nplain\n```')
    expect(html).toContain('data-language="text"')
  })

  it('handles empty input', () => {
    const result = parseMarkdown('')
    expect(result.html).toBe('')
    expect(result.headings).toEqual([])
  })
})

describe('extractCodeBlocks', () => {
  it('extracts fenced blocks with language and order', () => {
    const markdown = ['```js', 'const a = 1', '```', '', '~~~python', 'print("hi")', '~~~'].join('\n')
    const blocks = extractCodeBlocks(markdown)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ id: 'code-0', language: 'js', code: 'const a = 1', index: 0 })
    expect(blocks[1]).toMatchObject({ language: 'python', code: 'print("hi")' })
  })

  it('labels unlabelled fences as text', () => {
    const blocks = extractCodeBlocks('```\nplain\n```')
    expect(blocks[0].language).toBe('text')
  })

  it('returns an empty array when there are no fences', () => {
    expect(extractCodeBlocks('Just prose')).toEqual([])
  })
})

describe('stripMarkdown', () => {
  it('removes formatting while keeping link labels', () => {
    const result = stripMarkdown('# Title\n\n**Bold** [label](https://example.com)\n\n`code`')
    expect(result).toContain('Title')
    expect(result).toContain('Bold')
    expect(result).toContain('label')
    expect(result).not.toContain('https://example.com')
    expect(result).not.toContain('**')
  })
})
