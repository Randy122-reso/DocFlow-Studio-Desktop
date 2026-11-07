import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true
})

interface ParseRequest {
  id: number
  markdown: string
}

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, markdown } = event.data
  try {
    const raw = marked.parse(markdown, { async: false }) as string
    self.postMessage({ id, ok: true, raw })
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
