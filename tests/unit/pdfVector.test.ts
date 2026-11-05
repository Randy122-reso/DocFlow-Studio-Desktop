import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  buildVectorPdfBlob,
  UnsupportedVectorGlyphError
} from '../../src/utils/pdfExport'
import type { DocumentSettings } from '../../src/types/document'

const settings: DocumentSettings = {
  theme: 'modern',
  fontSize: 'md',
  fontFamily: 'sans',
  pageSize: 'A4',
  marginSize: 'normal',
  paperTone: 'white',
  showHeaderFooter: true,
  showPageNumbers: true,
  autoNumberHeadings: false,
  justifyText: false
}

const markdown = [
  '# Vector document',
  '',
  'This text must remain selectable in the PDF output.',
  '',
  '## Features',
  '',
  '- Tables',
  '- Lists',
  '- **Bold** and *italic*',
  '',
  '> A quote block.',
  '',
  '```ts',
  'const answer = 42',
  '```',
  '',
  '| Column A | Column B |',
  '| --- | --- |',
  '| One | Two |'
].join('\n')

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsArrayBuffer(blob)
  })
}

describe('buildVectorPdfBlob', () => {
  it('creates a valid selectable-text PDF with pdf-lib', async () => {
    const blob = await buildVectorPdfBlob(markdown, 'Vector Document', settings)
    expect(blob.type).toBe('application/pdf')

    const bytes = new Uint8Array(await blobToArrayBuffer(blob))
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')

    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(0)
    expect(pdf.getTitle()).toBe('Vector Document')

    const page = pdf.getPage(0)
    expect(page.getWidth()).toBeCloseTo(595.28, 1)
    expect(page.getHeight()).toBeCloseTo(841.89, 1)
  })

  it('adds pages for long documents', async () => {
    const long = Array.from({ length: 120 }, (_, index) => `## Section ${index}\n\nParagraph ${index} with text.`).join('\n\n')
    const blob = await buildVectorPdfBlob(long, 'Long Document', settings)
    const bytes = new Uint8Array(await blobToArrayBuffer(blob))
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(1)
  })

  it('rejects glyphs that WinAnsi cannot encode', async () => {
    await expect(buildVectorPdfBlob('# Emoji 😀\n\nText', 'Emoji', settings)).rejects.toBeInstanceOf(
      UnsupportedVectorGlyphError
    )
  })
})
