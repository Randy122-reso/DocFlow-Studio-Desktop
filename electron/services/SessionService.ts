import { promises as fs } from 'node:fs'
import { z } from 'zod'
import type { SessionDraft } from '../types/ipc'
import { atomicWriteText } from '../utils/atomic'

const sessionSchema = z.object({
  filePath: z.string().nullable(),
  fileName: z.string(),
  fileContent: z.string(),
  savedContent: z.string(),
  diskMtime: z.number().nullable(),
  encoding: z.enum(['utf-8', 'utf-8-bom', 'utf-16le']),
  lineEnding: z.enum(['lf', 'crlf', 'cr']),
  dirty: z.boolean(),
  timestamp: z.number()
})

export class SessionService {
  private readonly filePath: string
  private lastSignature = ''
  private cached: SessionDraft | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async read(): Promise<SessionDraft | null> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const parsed = sessionSchema.safeParse(JSON.parse(raw))
      if (!parsed.success) return null
      this.cached = parsed.data
      return parsed.data
    } catch {
      return null
    }
  }

  async write(draft: SessionDraft): Promise<void> {
    if (!draft.dirty) {
      await this.clear()
      return
    }
    const signature = JSON.stringify({
      filePath: draft.filePath,
      fileContent: draft.fileContent,
      savedContent: draft.savedContent,
      diskMtime: draft.diskMtime,
      dirty: draft.dirty
    })
    if (signature === this.lastSignature && this.cached) return
    this.lastSignature = signature
    this.cached = draft
    await atomicWriteText(this.filePath, `${JSON.stringify(draft, null, 2)}\n`)
  }

  async clear(): Promise<void> {
    this.lastSignature = ''
    this.cached = null
    await fs.unlink(this.filePath).catch(() => undefined)
  }
}
