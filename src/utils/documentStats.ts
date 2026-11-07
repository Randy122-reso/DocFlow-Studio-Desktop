import type { DocumentStats } from '../types/document'

export function computeDocumentStats(markdown: string): DocumentStats {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ')
  const words = withoutCode.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  const characters = markdown.length
  const charactersNoSpaces = markdown.replace(/\s/g, '').length
  const sentences = withoutCode.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim().length > 0).length
  const paragraphs = withoutCode
    .split(/\n\s*\n/)
    .filter((part) => part.trim().length > 0 && !/^#{1,6}\s/.test(part.trim())).length
  const headings = (markdown.match(/^#{1,6}\s+/gm) ?? []).length
  const codeBlocks = (markdown.match(/^```/gm) ?? []).length
  const links = (withoutCode.replace(/!\[[^\]]*\]\([^)]+\)/g, '').match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length
  const images = (markdown.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200))

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    headings,
    codeBlocks: Math.floor(codeBlocks / 2),
    links,
    images,
    readingTimeMinutes
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
