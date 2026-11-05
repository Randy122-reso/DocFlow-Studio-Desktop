import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { marked, type Token, type Tokens } from 'marked'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { DocumentSettings } from '../types/document'

const PAGE_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 }
}

const MARGIN_MM = {
  compact: 14,
  normal: 22,
  spacious: 30
}

/** PDF points per millimetre. */
const PT_PER_MM = 72 / 25.4

const PAGE_POINTS = {
  A4: { width: 210 * PT_PER_MM, height: 297 * PT_PER_MM },
  Letter: { width: 215.9 * PT_PER_MM, height: 279.4 * PT_PER_MM }
}

const MARGIN_POINTS = {
  compact: 14 * PT_PER_MM,
  normal: 22 * PT_PER_MM,
  spacious: 30 * PT_PER_MM
}

const BODY_SIZE = { sm: 9.5, md: 10.5, lg: 12 }
const HEADING_SIZE = { 1: 24, 2: 18, 3: 14.5, 4: 12.5, 5: 11, 6: 10.5 }
const ACCENTS: Record<string, [number, number, number]> = {
  modern: [0.71, 0.33, 0.04],
  academic: [0.11, 0.31, 0.85],
  minimal: [0.2, 0.25, 0.33],
  editorial: [0.75, 0.07, 0.24],
  legal: [0.5, 0.11, 0.11]
}
const PAPER_COLORS = {
  white: [1, 1, 1],
  cream: [0.99, 0.96, 0.89],
  dark: [0.11, 0.1, 0.09]
} as const

/**
 * Standard PDF fonts only cover WinAnsi. Documents containing emoji, CJK or
 * other glyphs outside that range should use the raster exporter instead.
 */
const WIN_ANSI_SPECIALS = new Set(
  '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178'.split('')
)

export class UnsupportedVectorGlyphError extends Error {
  readonly glyph: string

  constructor(glyph: string) {
    super(`UNSUPPORTED_VECTOR_GLYPH: "${glyph}" requires the raster PDF exporter`)
    this.name = 'UnsupportedVectorGlyphError'
    this.glyph = glyph
  }
}

function assertVectorText(value: string): string {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (char === '\n' || char === '\r' || char === '\t') continue
    if (code >= 0x20 && code <= 0x7e) continue
    if (code >= 0xa0 && code <= 0xff) continue
    if (WIN_ANSI_SPECIALS.has(char)) continue
    throw new UnsupportedVectorGlyphError(char)
  }
  return value
}

function inlineText(tokens: Token[] | undefined, fallback = ''): string {
  if (!tokens || tokens.length === 0) return fallback
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
        case 'escape':
        case 'codespan':
          return token.text
        case 'strong':
        case 'em':
        case 'del':
        case 'link':
          return inlineText(token.tokens, token.text)
        case 'image':
          return token.text ? `[${token.text}]` : ''
        case 'br':
          return '\n'
        case 'html': {
          const html = token as Tokens.HTML
          return html.text.replace(/<[^>]+>/g, '')
        }
        default:
          return 'text' in token && typeof token.text === 'string' ? token.text : ''
      }
    })
    .join('')
}

interface TextBlock {
  kind: 'heading' | 'paragraph' | 'quote' | 'list' | 'code' | 'table' | 'hr' | 'space'
  text?: string
  level?: number
  indent?: number
  marker?: string
  lines?: string[]
  table?: string[][]
}

function tokenToBlocks(token: Token, depth = 0): TextBlock[] {
  switch (token.type) {
    case 'heading': {
      const heading = token as Tokens.Heading
      return [{ kind: 'heading', level: heading.depth, text: inlineText(heading.tokens, heading.text) }]
    }
    case 'paragraph': {
      const paragraph = token as Tokens.Paragraph
      return [{ kind: 'paragraph', text: inlineText(paragraph.tokens, paragraph.text) }]
    }
    case 'blockquote': {
      const quote = token as Tokens.Blockquote
      return quote.tokens.flatMap((child) =>
        tokenToBlocks(child, depth + 1).map((block) =>
          block.kind === 'paragraph' ? { ...block, kind: 'quote' as const } : block
        )
      )
    }
    case 'list': {
      const list = token as Tokens.List
      const blocks: TextBlock[] = []
      list.items.forEach((item, index) => {
        const marker = list.ordered ? `${Number(list.start || 1) + index}.` : item.task ? (item.checked ? '☑' : '☐') : '•'
        const plain = inlineText(item.tokens, item.text)
        blocks.push({
          kind: 'list',
          indent: depth,
          marker: marker.replace('☑', '[x]').replace('☐', '[ ]'),
          text: plain.replace(/\n+/g, ' ')
        })
        for (const child of item.tokens ?? []) {
          if (child.type === 'list') blocks.push(...tokenToBlocks(child, depth + 1))
        }
      })
      return blocks
    }
    case 'code': {
      const code = token as Tokens.Code
      return [{ kind: 'code', lines: code.text.replace(/\t/g, '  ').split('\n') }]
    }
    case 'table': {
      const table = token as Tokens.Table
      const rows = [table.header.map((cell) => inlineText(cell.tokens, cell.text))]
      for (const row of table.rows) rows.push(row.map((cell) => inlineText(cell.tokens, cell.text)))
      return [{ kind: 'table', table: rows }]
    }
    case 'hr':
      return [{ kind: 'hr' }]
    case 'space':
      return [{ kind: 'space' }]
    case 'html': {
      const html = token as Tokens.HTML
      const text = html.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return text ? [{ kind: 'paragraph', text }] : []
    }
    default: {
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return token.tokens.flatMap((child) => tokenToBlocks(child, depth))
      }
      return []
    }
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = []
  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      result.push('')
      continue
    }
    let line = ''
    for (let word of words) {
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let cut = word.length - 1
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut -= 1
        if (line) {
          result.push(line)
          line = ''
        }
        result.push(word.slice(0, cut))
        word = word.slice(cut)
      }
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate
      } else {
        if (line) result.push(line)
        line = word
      }
    }
    if (line) result.push(line)
  }
  return result
}

interface VectorFonts {
  body: PDFFont
  bold: PDFFont
  mono: PDFFont
}

export async function buildVectorPdfBlob(
  markdown: string,
  title: string,
  settings: DocumentSettings
): Promise<Blob> {
  const renderBlocks = marked
    .lexer(markdown, { gfm: true, breaks: true })
    .flatMap((token) => tokenToBlocks(token))
  for (const block of renderBlocks) {
    if (block.text) assertVectorText(block.text)
    if (block.marker) assertVectorText(block.marker)
    for (const line of block.lines ?? []) assertVectorText(line)
    for (const row of block.table ?? []) for (const cell of row) assertVectorText(cell)
  }

  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  pdf.setAuthor('DocFlow Studio')
  pdf.setCreator('DocFlow Studio')
  pdf.setProducer('DocFlow Studio vector PDF (pdf-lib)')
  pdf.setSubject('Exported from DocFlow Studio Desktop')

  const fontFamily = settings.fontFamily
  const regularFont =
    fontFamily === 'serif' || fontFamily === 'display'
      ? StandardFonts.TimesRoman
      : fontFamily === 'mono'
        ? StandardFonts.Courier
        : StandardFonts.Helvetica
  const boldFont =
    fontFamily === 'serif' || fontFamily === 'display'
      ? StandardFonts.TimesRomanBold
      : fontFamily === 'mono'
        ? StandardFonts.CourierBold
        : StandardFonts.HelveticaBold
  const fonts: VectorFonts = {
    body: await pdf.embedFont(regularFont),
    bold: await pdf.embedFont(boldFont),
    mono: await pdf.embedFont(StandardFonts.Courier)
  }

  const pageSize = PAGE_POINTS[settings.pageSize]
  const margin = MARGIN_POINTS[settings.marginSize]
  const bodySize = BODY_SIZE[settings.fontSize]
  const contentWidth = pageSize.width - margin * 2
  const contentHeight = pageSize.height - margin * 2
  const lineFactor = 1.45
  const accent = ACCENTS[settings.theme] ?? ACCENTS.modern
  const paper = PAPER_COLORS[settings.paperTone] ?? PAPER_COLORS.white
  const darkPaper = settings.paperTone === 'dark'
  const textColor = darkPaper ? rgb(0.93, 0.91, 0.9) : rgb(0.11, 0.1, 0.09)
  const mutedColor = darkPaper ? rgb(0.68, 0.65, 0.62) : rgb(0.46, 0.43, 0.4)
  const pageNumberColor = darkPaper ? rgb(0.62, 0.6, 0.57) : rgb(0.55, 0.52, 0.49)

  const pages: PDFPage[] = []
  let page!: PDFPage
  let cursorY = 0
  let pageNumber = 0

  const addPage = (): void => {
    page = pdf.addPage([pageSize.width, pageSize.height])
    pageNumber += 1
    pages.push(page)
    if (darkPaper || settings.paperTone === 'cream') {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageSize.width,
        height: pageSize.height,
        color: rgb(paper[0], paper[1], paper[2])
      })
    }
    const topInset = settings.showHeaderFooter ? margin * 0.55 : margin
    cursorY = pageSize.height - topInset
  }

  const ensureSpace = (height: number): void => {
    const bottom = margin + (settings.showHeaderFooter ? margin * 0.45 : 0)
    if (cursorY - height < bottom) addPage()
  }

  const drawParagraph = (
    text: string,
    options: {
      font?: PDFFont
      size?: number
      color?: ReturnType<typeof rgb>
      indent?: number
      lineHeight?: number
      spacingAfter?: number
    } = {}
  ): void => {
    const font = options.font ?? fonts.body
    const size = options.size ?? bodySize
    const lineHeight = options.lineHeight ?? size * lineFactor
    const indent = options.indent ?? 0
    const lines = wrapText(text, font, size, contentWidth - indent)
    ensureSpace(lines.length * lineHeight + (options.spacingAfter ?? 0))
    for (const line of lines) {
      if (line) {
        page.drawText(line, {
          x: margin + indent,
          y: cursorY - size,
          size,
          font,
          color: options.color ?? textColor
        })
      }
      cursorY -= lineHeight
    }
    cursorY -= options.spacingAfter ?? 0
  }

  addPage()

  for (const block of renderBlocks) {
    if (block.kind === 'space') {
      cursorY -= bodySize * 0.5
      continue
    }
    if (block.kind === 'hr') {
      ensureSpace(14)
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageSize.width - margin, y: cursorY },
        thickness: 0.8,
        color: rgb(0.82, 0.79, 0.74)
      })
      cursorY -= 14
      continue
    }
    if (block.kind === 'heading' && block.text) {
      const level = Math.min(6, Math.max(1, block.level ?? 1))
      const size = HEADING_SIZE[level as 1 | 2 | 3 | 4 | 5 | 6] ?? bodySize
      cursorY -= size * 0.55
      drawParagraph(block.text, {
        font: fonts.bold,
        size,
        color: rgb(accent[0], accent[1], accent[2]),
        lineHeight: size * 1.2,
        spacingAfter: size * 0.55
      })
      continue
    }
    if (block.kind === 'paragraph' && block.text) {
      drawParagraph(block.text, { spacingAfter: bodySize * 0.55 })
      continue
    }
    if (block.kind === 'quote' && block.text) {
      const indent = 12
      const lineHeight = bodySize * lineFactor
      const lines = wrapText(block.text, fonts.body, bodySize, contentWidth - indent)
      const height = lines.length * lineHeight + 8
      ensureSpace(height)
      const top = cursorY
      page.drawRectangle({
        x: margin,
        y: cursorY - height + 4,
        width: 2.5,
        height: height - 4,
        color: rgb(accent[0], accent[1], accent[2])
      })
      for (const line of lines) {
        if (line) {
          page.drawText(line, {
            x: margin + indent,
            y: cursorY - bodySize,
            size: bodySize,
            font: fonts.body,
            color: mutedColor
          })
        }
        cursorY -= lineHeight
      }
      cursorY = top - height - bodySize * 0.4
      continue
    }
    if (block.kind === 'list' && block.text) {
      const indent = 10 + (block.indent ?? 0) * 16
      const markerWidth = 16
      const lineHeight = bodySize * lineFactor
      const lines = wrapText(block.text, fonts.body, bodySize, contentWidth - indent - markerWidth)
      ensureSpace(lines.length * lineHeight + 2)
      lines.forEach((line, index) => {
        if (index === 0 && block.marker) {
          page.drawText(block.marker, {
            x: margin + indent,
            y: cursorY - bodySize,
            size: bodySize,
            font: fonts.body,
            color: mutedColor
          })
        }
        if (line) {
          page.drawText(line, {
            x: margin + indent + markerWidth,
            y: cursorY - bodySize,
            size: bodySize,
            font: fonts.body,
            color: textColor
          })
        }
        cursorY -= lineHeight
      })
      cursorY -= 2
      continue
    }
    if (block.kind === 'code' && block.lines) {
      const size = Math.max(8, bodySize - 1.5)
      const lineHeight = size * 1.35
      const codeLines = block.lines.flatMap((line) => wrapText(line || ' ', fonts.mono, size, contentWidth - 20))
      const height = codeLines.length * lineHeight + 10
      ensureSpace(height)
      page.drawRectangle({
        x: margin,
        y: cursorY - height,
        width: contentWidth,
        height,
        color: darkPaper ? rgb(0.17, 0.16, 0.15) : rgb(0.965, 0.957, 0.94)
      })
      cursorY -= 5
      for (const line of codeLines) {
        page.drawText(line, {
          x: margin + 10,
          y: cursorY - size,
          size,
          font: fonts.mono,
          color: darkPaper ? rgb(0.9, 0.88, 0.84) : rgb(0.2, 0.19, 0.18)
        })
        cursorY -= lineHeight
      }
      cursorY -= 8
      continue
    }
    if (block.kind === 'table' && block.table && block.table.length > 0) {
      const columns = Math.max(...block.table.map((row) => row.length))
      const columnWidth = contentWidth / columns
      const size = Math.max(8, bodySize - 1)
      const lineHeight = size * 1.45
      for (const [rowIndex, row] of block.table.entries()) {
        const wrapped = Array.from({ length: columns }, (_, index) =>
          wrapText(row[index] ?? '', rowIndex === 0 ? fonts.bold : fonts.body, size, columnWidth - 8)
        )
        const rowHeight = Math.max(1, ...wrapped.map((lines) => lines.length)) * lineHeight + 6
        ensureSpace(rowHeight)
        page.drawRectangle({
          x: margin,
          y: cursorY - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rowIndex === 0
            ? darkPaper
              ? rgb(0.2, 0.19, 0.18)
              : rgb(0.96, 0.94, 0.91)
            : undefined
        })
        wrapped.forEach((lines, columnIndex) => {
          lines.forEach((line, lineIndex) => {
            page.drawText(line, {
              x: margin + columnIndex * columnWidth + 4,
              y: cursorY - size - 3 - lineIndex * lineHeight,
              size,
              font: rowIndex === 0 ? fonts.bold : fonts.body,
              color: textColor
            })
          })
        })
        page.drawLine({
          start: { x: margin, y: cursorY - rowHeight },
          end: { x: pageSize.width - margin, y: cursorY - rowHeight },
          thickness: 0.4,
          color: rgb(0.82, 0.79, 0.74)
        })
        cursorY -= rowHeight
      }
      cursorY -= 8
    }
  }

  if (pages.length === 0) addPage()

  if (settings.showHeaderFooter) {
    const today = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    pages.forEach((currentPage, index) => {
      if (!settings.showPageNumbers && index === 0) {
        // The header is still rendered; numbering is optional.
      }
      currentPage.drawText(title.slice(0, 80), {
        x: margin,
        y: pageSize.height - margin * 0.45,
        size: 8,
        font: fonts.body,
        color: mutedColor
      })
      currentPage.drawText('DocFlow Studio', {
        x: pageSize.width - margin - fonts.body.widthOfTextAtSize('DocFlow Studio', 8),
        y: pageSize.height - margin * 0.45,
        size: 8,
        font: fonts.body,
        color: mutedColor
      })
      currentPage.drawText(today, {
        x: margin,
        y: margin * 0.35,
        size: 8,
        font: fonts.body,
        color: pageNumberColor
      })
      if (settings.showPageNumbers) {
        const label = `${index + 1} / ${pages.length}`
        currentPage.drawText(label, {
          x: pageSize.width - margin - fonts.body.widthOfTextAtSize(label, 8),
          y: margin * 0.35,
          size: 8,
          font: fonts.body,
          color: pageNumberColor
        })
      }
    })
  }

  const bytes = await pdf.save()
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([buffer], { type: 'application/pdf' })
}

export function printDocument(settings?: DocumentSettings): void {
  if (!settings) {
    window.print()
    return
  }
  const size = settings.pageSize === 'A4' ? 'A4' : 'Letter'
  const margin = MARGIN_MM[settings.marginSize]
  const style = document.createElement('style')
  style.dataset.docflowPrint = 'true'
  style.textContent = `@page { size: ${size}; margin: ${margin}mm; }`
  document.head.append(style)
  window.addEventListener('afterprint', () => style.remove(), { once: true })
  window.print()
}

export async function buildPdfBlob(
  element: HTMLElement,
  title: string,
  settings: DocumentSettings
): Promise<Blob> {
  const background =
    settings.paperTone === 'cream' ? '#fdf6e3' : settings.paperTone === 'dark' ? '#1c1917' : '#ffffff'
  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    backgroundColor: background,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  })

  const page = PAGE_MM[settings.pageSize]
  const margin = MARGIN_MM[settings.marginSize]
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: settings.pageSize === 'A4' ? 'a4' : 'letter',
    compress: true
  })
  pdf.setProperties({ title, creator: 'DocFlow Studio', subject: 'Exported from DocFlow Studio Desktop' })

  const contentWidth = page.width - margin * 2
  const contentHeight = page.height - margin * 2
  const imageHeight = (canvas.height * contentWidth) / canvas.width
  const sliceHeightPx = Math.floor((contentHeight * canvas.width) / contentWidth)
  const pages = Math.max(1, Math.ceil(canvas.height / sliceHeightPx))
  const slice = document.createElement('canvas')
  const context = slice.getContext('2d')

  for (let index = 0; index < pages; index += 1) {
    if (index > 0) pdf.addPage()
    const sourceY = index * sliceHeightPx
    const height = Math.min(sliceHeightPx, canvas.height - sourceY)
    slice.width = canvas.width
    slice.height = height
    if (context) {
      context.fillStyle = background
      context.fillRect(0, 0, slice.width, slice.height)
      context.drawImage(canvas, 0, sourceY, canvas.width, height, 0, 0, canvas.width, height)
    }
    const sliceHeightMm = (height * contentWidth) / canvas.width
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.92),
      'JPEG',
      margin,
      margin,
      contentWidth,
      Math.min(sliceHeightMm, contentHeight),
      undefined,
      'FAST'
    )
    if (index === 0 && imageHeight < contentHeight) break
  }

  return pdf.output('blob')
}
