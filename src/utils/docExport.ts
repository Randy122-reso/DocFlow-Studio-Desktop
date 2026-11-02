import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip
} from 'docx'
import type { DocumentSettings } from '../types/document'
import { parseMarkdown } from './markdownParser'

const PAGE_SIZE_TWIPS = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 }
}

const MARGIN_INCHES = {
  compact: 0.55,
  normal: 0.85,
  spacious: 1.2
}

const FONTS = {
  sans: 'Calibri',
  serif: 'Georgia',
  display: 'Cambria',
  mono: 'Consolas'
}

const FONT_SIZES = {
  sm: 20,
  md: 22,
  lg: 25
}

const ACCENTS = {
  modern: 'B45309',
  academic: '1D4ED8',
  minimal: '334155',
  editorial: 'BE123C',
  legal: '7F1D1D'
}

type InlineChild = TextRun | ExternalHyperlink

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function sanitizeFileName(value: string, extension: string): string {
  const base = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return `${base || 'Untitled'}${extension.startsWith('.') ? extension : `.${extension}`}`
}

function inlineToDocx(text: string, settings: DocumentSettings): InlineChild[] {
  const font = FONTS[settings.fontFamily]
  const size = FONT_SIZES[settings.fontSize]
  const children: InlineChild[] = []
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0

  const pushText = (value: string, options: Record<string, unknown> = {}) => {
    if (!value) return
    children.push(new TextRun({ text: value, font, size, ...options } as ConstructorParameters<typeof TextRun>[0]))
  }

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    pushText(text.slice(lastIndex, index))
    const token = match[0]
    if (token.startsWith('**') || token.startsWith('__')) {
      pushText(token.slice(2, -2), { bold: true })
    } else if (token.startsWith('~~')) {
      pushText(token.slice(2, -2), { strike: true })
    } else if (token.startsWith('`')) {
      pushText(token.slice(1, -1), { font: 'Consolas', size: Math.max(16, size - 2) })
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (linkMatch) {
        children.push(
          new ExternalHyperlink({
            link: linkMatch[2],
            children: [
              new TextRun({
                text: linkMatch[1],
                font,
                size,
                color: '1D4ED8',
                underline: { type: 'single' }
              })
            ]
          })
        )
      } else {
        pushText(token)
      }
    } else {
      pushText(token.slice(1, -1), { italics: true })
    }
    lastIndex = index + token.length
  }
  pushText(text.slice(lastIndex))
  return children
}

function paragraph(text: string, settings: DocumentSettings, extra: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({
    alignment: settings.justifyText ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    spacing: { after: 140, line: 300 },
    children: inlineToDocx(text, settings),
    ...(extra as object)
  } as ConstructorParameters<typeof Paragraph>[0])
}

function buildTable(rows: string[][], settings: DocumentSettings): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (cells, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          children: cells.map(
            (cell) =>
              new TableCell({
                shading: rowIndex === 0 ? { fill: 'F5F1E8' } : undefined,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    children: inlineToDocx(cell.trim(), settings).map((child) => {
                      if (child instanceof TextRun) {
                        return new TextRun({
                          ...(child as unknown as { options: Record<string, unknown> }).options,
                          bold: rowIndex === 0 ? true : undefined
                        })
                      }
                      return child
                    })
                  })
                ]
              })
          )
        })
    )
  })
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*\|?\s*$/.test(line) && line.includes('-')
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line) ||
    /^~~~/.test(line) ||
    /^>\s?/.test(line) ||
    /^(\s*)([-*+]|\d+\.)\s+/.test(line) ||
    /^---+$/.test(line.trim()) ||
    line.includes('|')
  )
}

export async function buildDocxBlob(
  markdown: string,
  title: string,
  settings: DocumentSettings
): Promise<Blob> {
  const accent = ACCENTS[settings.theme]
  const font = FONTS[settings.fontFamily]
  const bodySize = FONT_SIZES[settings.fontSize]
  const page = PAGE_SIZE_TWIPS[settings.pageSize]
  const margin = convertInchesToTwip(MARGIN_INCHES[settings.marginSize])
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const children: Array<Paragraph | Table> = []
  const headingCounters = [0, 0, 0, 0, 0, 0]
  let index = 0

  const heading = (level: number, text: string) => {
    if (settings.autoNumberHeadings && level >= 2) {
      headingCounters[level - 1] += 1
      for (let cursor = level; cursor < headingCounters.length; cursor += 1) headingCounters[cursor] = 0
      const prefix = headingCounters.slice(1, level).filter((value) => value > 0).concat(headingCounters[level - 1])
      text = `${prefix.join('.')} ${text}`
    }
    const headingSize = Math.max(bodySize, 32 - level * 3)
    children.push(
      new Paragraph({
        heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][
          level - 1
        ],
        spacing: { before: level === 1 ? 0 : 260, after: 120 },
        children: inlineToDocx(text, settings).map((child) => {
          if (child instanceof TextRun) {
            return new TextRun({
              ...(child as unknown as { options: Record<string, unknown> }).options,
              bold: true,
              color: accent,
              size: headingSize,
              font
            })
          }
          return child
        })
      })
    )
  }

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const fence = /^(```+|~~~+)\s*([\w+#.-]*)/.exec(trimmed)
    if (fence) {
      const marker = fence[1]
      index += 1
      const codeLines: string[] = []
      while (index < lines.length && !lines[index].trim().startsWith(marker)) {
        codeLines.push(lines[index])
        index += 1
      }
      index += 1
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: 'F4F1EA', color: 'auto' },
          spacing: { before: 140, after: 180 },
          children: codeLines.map(
            (codeLine, lineIndex) =>
              new TextRun({
                text: codeLine || ' ',
                font: 'Consolas',
                size: Math.max(16, bodySize - 3),
                break: lineIndex > 0 ? 1 : 0
              })
          )
        })
      )
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (headingMatch) {
      heading(headingMatch[1].length, headingMatch[2])
      index += 1
      continue
    }

    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D6D3D1', space: 1 } },
          children: []
        })
      )
      index += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''))
        index += 1
      }
      const isCallout = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(quoteLines[0] ?? '')
      if (isCallout) quoteLines.shift()
      const text = quoteLines.join(' ').trim()
      if (text) {
        children.push(
          new Paragraph({
            indent: { left: 480 },
            spacing: { before: 120, after: 160 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 12 } },
            children: inlineToDocx(text, settings).map((child) => {
              if (child instanceof TextRun) {
                return new TextRun({
                  ...(child as unknown as { options: Record<string, unknown> }).options,
                  italics: true,
                  color: '57534E'
                })
              }
              return child
            })
          })
        )
      }
      continue
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const rows: string[][] = [splitTableRow(trimmed)]
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      const width = Math.max(...rows.map((row) => row.length))
      for (const row of rows) {
        while (row.length < width) row.push('')
      }
      children.push(buildTable(rows, settings))
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
      continue
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line)
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2)
      let itemText = listMatch[3]
      const task = /^\[( |x|X)\]\s+(.*)$/.exec(itemText)
      if (task) {
        itemText = `${task[1].toLowerCase() === 'x' ? '☑' : '☐'} ${task[2]}`
      }
      const ordered = /\d+\./.test(listMatch[2])
      children.push(
        new Paragraph({
          ...(ordered ? { indent: { left: 360 + indent * 360 } } : { bullet: { level: Math.min(indent, 3) } }),
          spacing: { after: 80, line: 280 },
          children: inlineToDocx(ordered ? `${listMatch[2]} ${itemText}` : itemText, settings)
        })
      )
      index += 1
      continue
    }

    const paragraphLines: string[] = [trimmed]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }
    children.push(paragraph(paragraphLines.join(' '), settings))
  }

  if (children.length === 0) {
    children.push(paragraph('This document is empty.', settings))
  }

  const headerFooter = {
    headers: settings.showHeaderFooter
      ? {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E7E5E4', space: 4 } },
                children: [
                  new TextRun({ text: title, font, size: Math.max(16, bodySize - 4), color: '78716C' })
                ]
              })
            ]
          })
        }
      : undefined,
    footers: settings.showPageNumbers
      ? {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    font,
                    size: Math.max(16, bodySize - 4),
                    color: '78716C',
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES]
                  })
                ]
              })
            ]
          })
        }
      : undefined
  }

  const document = new Document({
    creator: 'DocFlow Studio',
    title,
    description: 'Exported from DocFlow Studio Desktop',
    styles: {
      default: {
        document: {
          run: { font, size: bodySize, color: '1C1917' },
          paragraph: { spacing: { line: 300 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.width, height: page.height },
            margin: { top: margin, right: margin, bottom: margin, left: margin }
          }
        },
        ...headerFooter,
        children
      }
    ]
  })

  return Packer.toBlob(document)
}

export function buildHtmlDocument(markdown: string, title: string, settings: DocumentSettings): string {
  const { html } = parseMarkdown(markdown)
  const width = settings.pageSize === 'A4' ? '210mm' : '215.9mm'
  const padding = settings.marginSize === 'compact' ? '16mm' : settings.marginSize === 'spacious' ? '30mm' : '22mm'
  const background = settings.paperTone === 'cream' ? '#fdf6e3' : settings.paperTone === 'dark' ? '#1c1917' : '#ffffff'
  const color = settings.paperTone === 'dark' ? '#e7e5e4' : '#1c1917'
  const font =
    settings.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : settings.fontFamily === 'mono'
        ? '"Cascadia Mono", Consolas, monospace'
        : settings.fontFamily === 'display'
          ? 'Cambria, Georgia, serif'
          : '"Segoe UI", system-ui, sans-serif'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeXml(title)}</title>
<style>
  :root { color-scheme: ${settings.paperTone === 'dark' ? 'dark' : 'light'}; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; background: #ece7dd; color: ${color}; font-family: ${font}; }
  .page { width: ${width}; min-height: 297mm; margin: 0 auto; padding: ${padding}; background: ${background}; box-shadow: 0 20px 60px rgba(28,25,23,.18); }
  h1, h2, h3, h4, h5, h6 { line-height: 1.2; margin: 1.4em 0 .55em; }
  h1 { font-size: 2.1em; margin-top: 0; }
  h2 { font-size: 1.55em; border-bottom: 1px solid rgba(120,113,108,.3); padding-bottom: .25em; }
  h3 { font-size: 1.25em; }
  p { margin: 0 0 1em; line-height: 1.7; ${settings.justifyText ? 'text-align: justify;' : ''} }
  a { color: #b45309; }
  blockquote { margin: 1.3em 0; padding: .6em 1em; border-left: 4px solid #b45309; color: #57534e; background: rgba(180,83,9,.06); }
  blockquote p { margin: 0; font-style: italic; }
  .callout { margin: 1.4em 0; padding: 1em 1.2em; border-left: 4px solid #b45309; background: rgba(180,83,9,.07); border-radius: 6px; }
  .callout-title { font-weight: 700; text-transform: uppercase; letter-spacing: .08em; font-size: .72em; margin-bottom: .4em; }
  .callout-body p { margin: 0; }
  .code-block { margin: 1.4em 0; border: 1px solid rgba(120,113,108,.25); border-radius: 8px; overflow: hidden; background: #1c1917; }
  .code-block-head { display: flex; justify-content: space-between; padding: .45em .8em; background: #292524; color: #d6d3d1; font: 11px/1.4 Consolas, monospace; text-transform: uppercase; letter-spacing: .08em; }
  .code-copy { display: none; }
  pre { margin: 0; padding: 1em; overflow: auto; }
  code { font-family: "Cascadia Mono", Consolas, monospace; font-size: .88em; }
  pre code { color: #f5f5f4; }
  :not(pre) > code { background: rgba(120,113,108,.15); padding: .12em .35em; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 1.4em 0; font-size: .92em; }
  th, td { border: 1px solid rgba(120,113,108,.3); padding: .55em .7em; text-align: left; vertical-align: top; }
  th { background: rgba(120,113,108,.1); font-weight: 700; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  hr { border: 0; border-top: 1px solid rgba(120,113,108,.35); margin: 2em 0; }
  ul, ol { padding-left: 1.5em; margin: 0 0 1em; line-height: 1.7; }
  li { margin: .3em 0; }
  li input[type="checkbox"] { margin-right: .5em; }
  .doc-meta { margin-top: 2.5em; padding-top: .8em; border-top: 1px solid rgba(120,113,108,.3); font-size: .78em; color: #78716c; }
  @media print {
    body { background: #fff; padding: 0; }
    .page { box-shadow: none; width: auto; min-height: 0; padding: 0; background: #fff; }
    .code-copy { display: none; }
  }
</style>
</head>
<body>
<main class="page">
${html}
<div class="doc-meta">Exported with DocFlow Studio Desktop${settings.showHeaderFooter ? ` · ${escapeXml(title)}` : ''}</div>
</main>
</body>
</html>`
}

export function buildWordHtml(markdown: string, title: string, settings: DocumentSettings): string {
  const { html } = parseMarkdown(markdown)
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeXml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: ${settings.pageSize === 'A4' ? '21cm 29.7cm' : '21.59cm 27.94cm'}; margin: ${settings.marginSize === 'compact' ? '1.4cm' : settings.marginSize === 'spacious' ? '3cm' : '2.2cm'}; }
  body { font-family: ${settings.fontFamily === 'serif' ? 'Georgia' : settings.fontFamily === 'mono' ? 'Consolas' : 'Calibri'}; font-size: ${settings.fontSize === 'sm' ? '10pt' : settings.fontSize === 'lg' ? '12.5pt' : '11pt'}; color: #1c1917; line-height: 1.55; }
  h1 { font-size: 22pt; color: #b45309; } h2 { font-size: 16pt; border-bottom: 1px solid #ddd; } h3 { font-size: 13pt; }
  table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #bbb; padding: 6px; } th { background: #f3efe6; }
  pre { background: #f4f1ea; padding: 10px; font-family: Consolas; font-size: 9pt; }
  blockquote { border-left: 3px solid #b45309; margin-left: 0; padding-left: 12px; color: #57534e; }
  .callout { border-left: 3px solid #b45309; background: #fdf3e4; padding: 10px; }
  .code-block-head { display: none; }
  ${settings.justifyText ? 'p { text-align: justify; }' : ''}
</style>
</head>
<body>${html}</body>
</html>`
}
