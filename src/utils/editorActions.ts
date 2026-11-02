export type FormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'inlineCode'
  | 'codeBlock'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'bullet'
  | 'numbered'
  | 'task'
  | 'link'
  | 'image'
  | 'table'
  | 'hr'

export interface EditResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

function wrap(textarea: HTMLTextAreaElement, before: string, after: string, placeholder: string): EditResult {
  const value = textarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = value.slice(start, end) || placeholder
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
  return {
    value: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length
  }
}

function prefixLines(textarea: HTMLTextAreaElement, prefix: string): EditResult {
  const value = textarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const block = value.slice(lineStart, end)
  const changed = block
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
  const next = `${value.slice(0, lineStart)}${changed}${value.slice(end)}`
  return {
    value: next,
    selectionStart: Math.max(lineStart, start + prefix.length),
    selectionEnd: end + prefix.length * block.split('\n').length
  }
}

function insertBlock(textarea: HTMLTextAreaElement, block: string): EditResult {
  const value = textarea.value
  const start = textarea.selectionStart
  const before = value.slice(0, start)
  const prefix = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const next = `${before}${prefix}${block}${value.slice(textarea.selectionEnd)}`
  const cursor = start + prefix.length + block.length
  return { value: next, selectionStart: cursor, selectionEnd: cursor }
}

const TABLE_TEMPLATE = `| Column | Column |
| :--- | :--- |
| Cell | Cell |
| Cell | Cell |`

export function applyFormatting(textarea: HTMLTextAreaElement, action: FormatAction): EditResult {
  switch (action) {
    case 'bold':
      return wrap(textarea, '**', '**', 'bold text')
    case 'italic':
      return wrap(textarea, '_', '_', 'italic text')
    case 'strike':
      return wrap(textarea, '~~', '~~', 'strikethrough')
    case 'inlineCode':
      return wrap(textarea, '`', '`', 'code')
    case 'codeBlock':
      return insertBlock(textarea, `\`\`\`typescript\n${textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) || '// code'}\n\`\`\``)
    case 'h1':
      return prefixLines(textarea, '# ')
    case 'h2':
      return prefixLines(textarea, '## ')
    case 'h3':
      return prefixLines(textarea, '### ')
    case 'quote':
      return prefixLines(textarea, '> ')
    case 'bullet':
      return prefixLines(textarea, '- ')
    case 'numbered':
      return prefixLines(textarea, '1. ')
    case 'task':
      return prefixLines(textarea, '- [ ] ')
    case 'link':
      return wrap(textarea, '[', '](https://example.com)', 'link text')
    case 'image':
      return wrap(textarea, '![', '](https://example.com/image.png)', 'alt text')
    case 'table':
      return insertBlock(textarea, TABLE_TEMPLATE)
    case 'hr':
      return insertBlock(textarea, '---')
    default:
      return {
        value: textarea.value,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd
      }
  }
}
