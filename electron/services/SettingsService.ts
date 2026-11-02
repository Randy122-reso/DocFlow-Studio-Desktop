import { z } from 'zod'
import type { AppSettings } from '../types/ipc'
import { readJsonFile, writeJsonAtomic } from '../utils/atomic'

const windowBoundsSchema = z.object({
  width: z.number().int().min(800).max(7680),
  height: z.number().int().min(600).max(4320),
  x: z.number().int().nullable(),
  y: z.number().int().nullable()
})

export const settingsSchema = z.object({
  schemaVersion: z.number().int().min(1).max(999),
  theme: z.enum(['modern', 'academic', 'minimal', 'editorial', 'legal']),
  fontSize: z.enum(['sm', 'md', 'lg']),
  fontFamily: z.enum(['sans', 'serif', 'display', 'mono']),
  pageSize: z.enum(['A4', 'Letter']),
  marginSize: z.enum(['compact', 'normal', 'spacious']),
  paperTone: z.enum(['white', 'cream', 'dark']),
  showHeaderFooter: z.boolean(),
  showPageNumbers: z.boolean(),
  autoNumberHeadings: z.boolean(),
  justifyText: z.boolean(),
  windowBounds: windowBoundsSchema,
  lastOpenedDir: z.string().nullable(),
  lastExportDir: z.string().nullable(),
  uiState: z.object({
    zoomLevel: z.number().int().min(50).max(200),
    isPagedMode: z.boolean(),
    autoScroll: z.boolean(),
    syncScrollWithToc: z.boolean()
  })
})

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  theme: 'modern',
  fontSize: 'md',
  fontFamily: 'sans',
  pageSize: 'A4',
  marginSize: 'normal',
  paperTone: 'white',
  showHeaderFooter: true,
  showPageNumbers: true,
  autoNumberHeadings: false,
  justifyText: false,
  windowBounds: { width: 1400, height: 900, x: null, y: null },
  lastOpenedDir: null,
  lastExportDir: null,
  uiState: {
    zoomLevel: 100,
    isPagedMode: true,
    autoScroll: false,
    syncScrollWithToc: true
  }
}

export class SettingsService {
  private readonly filePath: string
  private values: AppSettings = { ...DEFAULT_SETTINGS }
  private ready = false
  private timer: NodeJS.Timeout | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async init(): Promise<void> {
    const stored = await readJsonFile<Record<string, unknown>>(this.filePath, {})
    const patched = { ...stored }
    if (!patched.uiState || typeof patched.uiState !== 'object') {
      patched.uiState = DEFAULT_SETTINGS.uiState
    }
    const migrated = this.migrate(patched)
    const parsed = settingsSchema.safeParse(migrated)
    this.values = parsed.success ? parsed.data : { ...DEFAULT_SETTINGS }
    this.ready = true
    if (!parsed.success || (stored as { schemaVersion?: number }).schemaVersion !== this.values.schemaVersion) {
      await this.persist()
    }
  }

  all(): AppSettings {
    return structuredClone(this.values)
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return structuredClone(this.values[key])
  }

  async set(patch: Partial<AppSettings>): Promise<AppSettings> {
    await this.ensureReady()
    const merged: AppSettings = {
      ...this.values,
      ...patch,
      windowBounds: patch.windowBounds
        ? { ...this.values.windowBounds, ...patch.windowBounds }
        : this.values.windowBounds,
      schemaVersion: this.values.schemaVersion
    }
    const parsed = settingsSchema.safeParse(merged)
    if (!parsed.success) {
      throw new Error(`Invalid settings: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`)
    }
    this.values = parsed.data
    this.schedulePersist()
    return this.all()
  }

  async reset(): Promise<AppSettings> {
    await this.ensureReady()
    const windowBounds = this.values.windowBounds
    this.values = { ...DEFAULT_SETTINGS, windowBounds }
    await this.persist()
    return this.all()
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.ready) await this.persist()
  }

  migrate(from: Record<string, unknown>): AppSettings {
    const source = from && typeof from === 'object' ? from : {}
    const version = Number(source.schemaVersion ?? 0)
    let migrated: Record<string, unknown> = { ...source }

    if (version < 1) {
      migrated = {
        ...DEFAULT_SETTINGS,
        ...migrated,
        schemaVersion: 1,
        windowBounds: {
          ...DEFAULT_SETTINGS.windowBounds,
          ...((source.windowBounds as Record<string, unknown>) ?? {})
        }
      }
    }

    return {
      ...DEFAULT_SETTINGS,
      ...migrated,
      schemaVersion: 1,
      windowBounds: {
        ...DEFAULT_SETTINGS.windowBounds,
        ...((migrated.windowBounds as Record<string, unknown>) ?? {})
      },
      uiState: {
        ...DEFAULT_SETTINGS.uiState,
        ...((migrated.uiState as Record<string, unknown>) ?? {})
      }
    } as AppSettings
  }

  private schedulePersist(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.persist()
    }, 500)
  }

  private async persist(): Promise<void> {
    await writeJsonAtomic(this.filePath, this.values)
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) await this.init()
  }
}
