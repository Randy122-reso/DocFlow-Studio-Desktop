import { basename, resolve } from 'node:path'
import type { RecentFile } from '../types/ipc'
import { readJsonFile, writeJsonAtomic } from '../utils/atomic'

interface RecentStore {
  version: number
  files: RecentFile[]
}

export interface RecentFilesOptions {
  max: number
  ttlDays: number
}

export class RecentFilesService {
  private readonly filePath: string
  private readonly max: number
  private readonly ttlDays: number
  private files: RecentFile[] = []
  private ready = false
  private onChange?: (files: RecentFile[]) => void

  constructor(filePath: string, options: RecentFilesOptions) {
    this.filePath = filePath
    this.max = options.max
    this.ttlDays = options.ttlDays
  }

  setChangeListener(listener: (files: RecentFile[]) => void): void {
    this.onChange = listener
  }

  async init(): Promise<void> {
    const store = await readJsonFile<RecentStore>(this.filePath, { version: 1, files: [] })
    const now = Date.now()
    const cutoff = now - this.ttlDays * 24 * 60 * 60 * 1000
    const seen = new Set<string>()
    const valid: RecentFile[] = []
    for (const item of Array.isArray(store.files) ? store.files : []) {
      if (!item || typeof item.path !== 'string' || !resolve(item.path)) continue
      const key = this.key(item.path)
      if (seen.has(key)) continue
      if (!item.pinned && item.lastOpenedAt < cutoff) continue
      seen.add(key)
      valid.push({
        path: resolve(item.path),
        displayName: item.displayName || basename(item.path),
        lastOpenedAt: Number(item.lastOpenedAt) || now,
        size: Number(item.size) || 0,
        pinned: Boolean(item.pinned)
      })
    }
    this.files = this.cap(valid)
    this.ready = true
    await this.persist()
    this.emit()
  }

  list(): RecentFile[] {
    return [...this.files].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
  }

  async add(input: { path: string; displayName?: string; size?: number }): Promise<RecentFile[]> {
    await this.ensureReady()
    const path = resolve(input.path)
    const key = this.key(path)
    const existing = this.files.find((item) => this.key(item.path) === key)
    if (existing) {
      existing.lastOpenedAt = Date.now()
      existing.displayName = input.displayName || existing.displayName || basename(path)
      existing.size = input.size ?? existing.size
    } else {
      this.files.push({
        path,
        displayName: input.displayName || basename(path),
        lastOpenedAt: Date.now(),
        size: input.size ?? 0,
        pinned: false
      })
    }
    this.files = this.cap(this.files)
    await this.persist()
    this.emit()
    return this.list()
  }

  async remove(path: string): Promise<RecentFile[]> {
    await this.ensureReady()
    const key = this.key(path)
    this.files = this.files.filter((item) => this.key(item.path) !== key)
    await this.persist()
    this.emit()
    return this.list()
  }

  async clear(keepPinned = true): Promise<RecentFile[]> {
    await this.ensureReady()
    this.files = keepPinned ? this.files.filter((item) => item.pinned) : []
    await this.persist()
    this.emit()
    return this.list()
  }

  async togglePin(path: string): Promise<RecentFile[]> {
    await this.ensureReady()
    const key = this.key(path)
    const item = this.files.find((entry) => this.key(entry.path) === key)
    if (item) item.pinned = !item.pinned
    this.files = this.cap(this.files)
    await this.persist()
    this.emit()
    return this.list()
  }

  async prune(): Promise<RecentFile[]> {
    await this.ensureReady()
    const cutoff = Date.now() - this.ttlDays * 24 * 60 * 60 * 1000
    this.files = this.files.filter((item) => item.pinned || item.lastOpenedAt >= cutoff)
    this.files = this.cap(this.files)
    await this.persist()
    this.emit()
    return this.list()
  }

  private cap(files: RecentFile[]): RecentFile[] {
    const pinned = files.filter((item) => item.pinned)
    const unpinned = files
      .filter((item) => !item.pinned)
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, this.max)
    return [...pinned, ...unpinned]
  }

  private key(path: string): string {
    const normalized = resolve(path)
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) await this.init()
  }

  private async persist(): Promise<void> {
    await writeJsonAtomic(this.filePath, { version: 1, files: this.files })
  }

  private emit(): void {
    this.onChange?.(this.list())
  }
}
