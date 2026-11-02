import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
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
