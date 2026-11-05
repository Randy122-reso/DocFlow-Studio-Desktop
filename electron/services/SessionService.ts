import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { SessionDraft, SessionState, SessionWindow, TabSnapshot } from '../types/ipc'
import { atomicWriteText } from '../utils/atomic'

const tabSnapshotSchema = z.object({
  id: z.string().min(1).max(128),
  filePath: z.string().nullable(),
  displayName: z.string().max(512),
  fileContent: z.string(),
  savedContent: z.string(),
  diskMtime: z.number().nullable(),
  encoding: z.enum(['utf-8', 'utf-8-bom', 'utf-16le']),
  lineEnding: z.enum(['lf', 'crlf', 'cr']),
  isPinned: z.boolean(),
  editorScrollTop: z.number().min(0),
  previewScrollTop: z.number().min(0),
  cursorOffset: z.number().int().min(0),
  selectionEnd: z.number().int().min(0)
})

const windowSchema = z.object({
  id: z.string().min(1).max(128),
  bounds: z.object({
    width: z.number().int().min(400).max(7680),
    height: z.number().int().min(300).max(4320),
    x: z.number().int().nullable(),
    y: z.number().int().nullable()
  }),
  tabs: z.array(tabSnapshotSchema).max(100),
  activeTabId: z.string().nullable()
})

const findOptionsSchema = z.object({
  matchCase: z.boolean(),
  matchWholeWord: z.boolean(),
  mode: z.enum(['normal', 'extended', 'regex']),
  dotMatchesNewline: z.boolean(),
  wrapAround: z.boolean(),
  inSelection: z.boolean(),
  backward: z.boolean(),
  extendedUnicode: z.boolean()
})

export const sessionStateSchema = z.object({
  schemaVersion: z.literal(5),
  windows: z.array(windowSchema).max(20),
  activeWindowId: z.string().nullable(),
  findHistory: z.array(z.string().max(2048)).max(100),
  findOptions: findOptionsSchema
})

const legacySessionTabSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  filePath: z.string().nullable(),
  displayName: z.string().max(512),
  fileContent: z.string(),
  savedContent: z.string().optional(),
  diskMtime: z.number().nullable().optional(),
  encoding: z.enum(['utf-8', 'utf-8-bom', 'utf-16le']).optional(),
  lineEnding: z.enum(['lf', 'crlf', 'cr']).optional(),
  isPinned: z.boolean().optional(),
  editorScrollTop: z.number().min(0).optional(),
  previewScrollTop: z.number().min(0).optional(),
  cursorOffset: z.number().int().min(0).optional(),
  selectionEnd: z.number().int().min(0).optional()
})

const legacySessionV4Schema = z.object({
  schemaVersion: z.literal(4),
  tabs: z.array(legacySessionTabSchema).max(100),
  activeTabId: z.string().nullable().optional(),
  findHistory: z.array(z.string().max(2048)).max(100).optional(),
  findOptions: findOptionsSchema.partial().optional()
})

const legacyDraftSchema = z.object({
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

export const DEFAULT_FIND_OPTIONS: SessionState['findOptions'] = {
  matchCase: false,
  matchWholeWord: false,
  mode: 'normal',
  dotMatchesNewline: false,
  wrapAround: true,
  inSelection: false,
  backward: false,
  extendedUnicode: true
}

export class SessionService {
  private readonly filePath: string
  private lastSignature = ''
  private cached: SessionDraft | null = null
  private cachedState: SessionState | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async readSession(): Promise<SessionState | null> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const json = JSON.parse(raw) as unknown
      const parsed = sessionStateSchema.safeParse(json)
      if (parsed.success) {
        this.cachedState = parsed.data
        return parsed.data
      }
      const legacyV4 = legacySessionV4Schema.safeParse(json)
      if (legacyV4.success) {
        const migrated = this.migrateSessionV4(legacyV4.data)
        // If migration results in no windows, treat as missing session
        if (!migrated.windows || migrated.windows.length === 0) return null
        this.cachedState = migrated
        return migrated
      }
      const legacy = legacyDraftSchema.safeParse(json)
      if (legacy.success) {
        const migrated = this.migrateLegacyDraft(legacy.data)
        this.cachedState = migrated
        return migrated
      }
      return null
    } catch {
      return null
    }
  }

  async writeSession(state: SessionState): Promise<void> {
    const sanitized: SessionState = {
      ...state,
      schemaVersion: 5,
      windows: state.windows
        .slice(0, 20)
        .map((window) => ({
          ...window,
          tabs: window.tabs.filter((tab) => {
            if (tab.filePath) return true
            // Clean untitled/welcome documents are not worth restoring.
            return tab.fileContent.length > 0 && tab.fileContent !== tab.savedContent
          })
        }))
        .filter((window) => window.tabs.length > 0)
    }
    const signature = JSON.stringify(sanitized)
    if (sanitized.windows.length === 0) {
      // Nothing is worth restoring anymore; drop the persisted draft.
      this.lastSignature = ''
      this.cachedState = null
      await fs.unlink(this.filePath).catch(() => undefined)
      return
    }
    if (signature === this.lastSignature && this.cachedState) return
    this.lastSignature = signature
    this.cachedState = sanitized
    await atomicWriteText(this.filePath, `${JSON.stringify(sanitized, null, 2)}\n`)
  }

  async saveWindow(window: SessionWindow): Promise<SessionState> {
    const current = this.cachedState ?? (await this.readSession())
    const state: SessionState = current ?? {
      schemaVersion: 5,
      windows: [],
      activeWindowId: null,
      findHistory: [],
      findOptions: { ...DEFAULT_FIND_OPTIONS }
    }
    const index = state.windows.findIndex((item) => item.id === window.id)
    if (index >= 0) state.windows[index] = window
    else state.windows.push(window)
    state.activeWindowId = state.windows.some((item) => item.id === state.activeWindowId)
      ? state.activeWindowId
      : window.id
    await this.writeSession(state)
    return state
  }

  async removeWindow(windowId: string): Promise<SessionState> {
    const current = this.cachedState ?? (await this.readSession())
    const state: SessionState = current ?? {
      schemaVersion: 5,
      windows: [],
      activeWindowId: null,
      findHistory: [],
      findOptions: { ...DEFAULT_FIND_OPTIONS }
    }
    state.windows = state.windows.filter((item) => item.id !== windowId)
    if (state.activeWindowId === windowId) {
      state.activeWindowId = state.windows[0]?.id ?? null
    }
    await this.writeSession(state)
    return state
  }

  /** Legacy single-draft API kept for migration and recovery compatibility. */
  async read(): Promise<SessionDraft | null> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const parsed = legacyDraftSchema.safeParse(JSON.parse(raw))
      if (!parsed.success) return null
      this.cached = parsed.data
      return parsed.data
    } catch {
      return null
    }
  }

  /** Legacy single-draft write; the app uses writeSession for v1.6. */
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
    this.cachedState = null
    await fs.unlink(this.filePath).catch(() => undefined)
  }

  migrateSessionV4(session: z.infer<typeof legacySessionV4Schema>): SessionState {
    const tabs: TabSnapshot[] = session.tabs.map((tab) => ({
      id: tab.id ?? randomUUID(),
      filePath: tab.filePath,
      displayName: tab.displayName,
      fileContent: tab.fileContent,
      savedContent: tab.savedContent ?? tab.fileContent,
      diskMtime: tab.diskMtime ?? null,
      encoding: tab.encoding ?? 'utf-8',
      lineEnding: tab.lineEnding ?? 'lf',
      isPinned: tab.isPinned ?? false,
      editorScrollTop: tab.editorScrollTop ?? 0,
      previewScrollTop: tab.previewScrollTop ?? 0,
      cursorOffset: tab.cursorOffset ?? 0,
      selectionEnd: tab.selectionEnd ?? 0
    }))
    const windowId = randomUUID()
    const activeTabId = tabs.some((tab) => tab.id === session.activeTabId)
      ? session.activeTabId ?? null
      : tabs[0]?.id ?? null
    return {
      schemaVersion: 5,
      windows: [
        {
          id: windowId,
          bounds: { width: 1400, height: 900, x: null, y: null },
          tabs,
          activeTabId
        }
      ],
      activeWindowId: windowId,
      findHistory: session.findHistory ?? [],
      findOptions: { ...DEFAULT_FIND_OPTIONS, ...session.findOptions }
    }
  }

  migrateLegacyDraft(draft: SessionDraft): SessionState {
    const tab: TabSnapshot = {
      id: randomUUID(),
      filePath: draft.filePath,
      displayName: draft.fileName,
      fileContent: draft.fileContent,
      savedContent: draft.savedContent,
      diskMtime: draft.diskMtime,
      encoding: draft.encoding,
      lineEnding: draft.lineEnding,
      isPinned: false,
      editorScrollTop: 0,
      previewScrollTop: 0,
      cursorOffset: 0,
      selectionEnd: 0
    }
    return {
      schemaVersion: 5,
      windows: [
        {
          id: randomUUID(),
          bounds: { width: 1400, height: 900, x: null, y: null },
          tabs: [tab],
          activeTabId: tab.id
        }
      ],
      activeWindowId: null,
      findHistory: [],
      findOptions: { ...DEFAULT_FIND_OPTIONS }
    }
  }
}
