import { useCallback, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import type { HeadingItem } from '../types/document'

export function useScrollSync(editorRef: React.RefObject<HTMLTextAreaElement | null>, previewRef: React.RefObject<HTMLDivElement | null>) {
  const syncScrollWithToc = useUIStore((s) => s.syncScrollWithToc)
  const autoScroll = useUIStore((s) => s.autoScroll)

  const handleTocClick = useCallback((item: HeadingItem) => {
    if (!syncScrollWithToc) return
    const previewEl = previewRef.current
    if (previewEl) {
      const target = previewEl.querySelector(`[id="${item.id}"]`) as HTMLElement | null
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    const editorEl = editorRef.current
    if (editorEl) {
      const text = editorEl.value
      const lines = text.split('\n')
      // Find first line matching heading level and text approx
      const levelPrefix = '#'.repeat(item.level)
      let lineIndex = -1
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (trimmed.startsWith(levelPrefix + ' ') && trimmed.includes(item.text)) {
          lineIndex = i
          break
        }
      }
      if (lineIndex >= 0) {
        const lineHeight = parseFloat(window.getComputedStyle(editorEl).lineHeight) || 20
        const scrollTop = Math.max(0, lineIndex * lineHeight - 40)
        editorEl.scrollTo({ top: scrollTop, behavior: 'smooth' })
        const pos = text.split('\n').slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0)
        // Place cursor roughly at start of line
        editorEl.setSelectionRange(pos, pos)
        editorEl.focus()
      }
    }
  }, [syncScrollWithToc, editorRef, previewRef])

  const handleEditorScroll = useCallback(() => {
    if (!autoScroll) return
    const editorEl = editorRef.current
    const previewEl = previewRef.current
    if (!editorEl || !previewEl) return
    const ratio = editorEl.scrollTop / Math.max(1, editorEl.scrollHeight - editorEl.clientHeight)
    const maxScroll = Math.max(1, previewEl.scrollHeight - previewEl.clientHeight)
    previewEl.scrollTop = ratio * maxScroll
  }, [autoScroll, editorRef, previewRef])

  return { handleTocClick, handleEditorScroll }
}
