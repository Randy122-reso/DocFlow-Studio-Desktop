import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { CodeBlockItem, HeadingItem } from '../types/document'

marked.setOptions({
  gfm: true,
  breaks: true
})

const CALLOUT_LABELS: Record<string, string> = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution'
}

let hookInstalled = false
function installSanitizerHook(): void {
  if (hookInstalled) return
  hookInstalled = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? ''
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })
}

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'section'
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function textFromHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, '')).trim()
}

function transformCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br\s*\/?>)?\s*([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
    (_match, kind: string, content: string) => {
      const upper = kind.toUpperCase()
      const label = CALLOUT_LABELS[upper] ?? 'Note'
      return `<aside class="callout callout-${upper.toLowerCase()}"><div class="callout-title">${label}</div><div class="callout-body"><p>${content}</p></div></aside>`
    }
  )
}

function transformHeadings(html: string): { html: string; headings: HeadingItem[] } {
  const headings: HeadingItem[] = []
  const used = new Map<string, number>()
  const output = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/gi, (_match, levelText: string, inner: string) => {
    const level = Number(levelText)
    const text = textFromHtml(inner)
    const base = slugify(text)
    const count = used.get(base) ?? 0
    used.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count + 1}`
    headings.push({ id, text, level })
    return `<h${level} id="${id}">${inner}</h${level}>`
  })
  return { html: output, headings }
}

function transformCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code(?: class="language-([\w+#.-]+)")?>([\s\S]*?)<\/code><\/pre>/gi,
    (_match, language: string | undefined, code: string) => {
      const lang = (language ?? 'text').toLowerCase()
      return `<div class="code-block" data-language="${lang}"><div class="code-block-head"><span class="code-language">${lang}</span><button type="button" class="code-copy" data-copy-code>Copy</button></div><pre><code class="language-${lang}">${code}</code></pre></div>`
    }
  )
}

export interface ParsedMarkdown {
  html: string
  headings: HeadingItem[]
}

export function parseHtml(raw: string): ParsedMarkdown {
  installSanitizerHook()
  const clean = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel', 'checked', 'disabled', 'type'],
    ADD_TAGS: ['input']
  })
  const withCallouts = transformCallouts(clean)
  const headingResult = transformHeadings(withCallouts)
  const html = transformCodeBlocks(headingResult.html)
  return { html, headings: headingResult.headings }
}

export function parseMarkdown(markdown: string): ParsedMarkdown {
  const raw = marked.parse(markdown, { async: false }) as string
  return parseHtml(raw)
}

export function extractCodeBlocks(markdown: string): CodeBlockItem[] {
  const blocks: CodeBlockItem[] = []
  const fence = /^ {0,3}(```+|~~~+)[ \t]*([\w+#.-]*)[^\n]*\n([\s\S]*?)^ {0,3}\1[ \t]*$/gm
  let match: RegExpExecArray | null
  let index = 0
  while ((match = fence.exec(markdown)) !== null) {
    blocks.push({
      id: `code-${index}`,
      language: (match[2] || 'text').toLowerCase(),
      code: match[3].replace(/\n$/, ''),
      index
    })
    index += 1
  }
  return blocks
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
