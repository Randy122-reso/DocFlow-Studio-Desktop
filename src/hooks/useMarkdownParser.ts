import { useEffect, useRef, useState } from 'react'
import { parseHtml, parseMarkdown, type ParsedMarkdown } from '../utils/markdownParser'

interface PendingParse {
  resolve(raw: string): void
  reject(error: Error): void
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingParse>()

function getWorker(): Worker | null {
  if (worker) return worker
  if (typeof Worker === 'undefined') return null
  try {
    worker = new Worker(new URL('../workers/markdownWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; raw?: string; error?: string }>) => {
      const { id, ok, raw, error } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      if (ok && typeof raw === 'string') entry.resolve(raw)
      else entry.reject(new Error(error ?? 'Markdown worker failed'))
    }
    worker.onerror = () => {
      for (const entry of pending.values()) entry.reject(new Error('Markdown worker crashed'))
      pending.clear()
      worker = null
    }
    return worker
  } catch {
    return null
  }
}

export function useMarkdownParser(markdown: string): ParsedMarkdown {
  const [parsed, setParsed] = useState<ParsedMarkdown>(() => parseMarkdown(markdown))
  const latestRef = useRef(markdown)

  useEffect(() => {
    latestRef.current = markdown
    const w = getWorker()
    if (!w) {
      setParsed(parseMarkdown(markdown))
      return
    }

    const id = nextId++
    // Small debounce so rapid keystrokes do not flood the worker.
    const timer = setTimeout(() => {
      pending.set(id, {
        resolve: (raw) => {
          if (latestRef.current === markdown) setParsed(parseHtml(raw))
        },
        reject: () => {
          if (latestRef.current === markdown) setParsed(parseMarkdown(markdown))
        }
      })
      w.postMessage({ id, markdown })
    }, 60)

    return () => clearTimeout(timer)
  }, [markdown])

  return parsed
}
