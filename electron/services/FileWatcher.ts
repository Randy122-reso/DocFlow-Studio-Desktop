import { watchFile, unwatchFile, type Stats } from 'node:fs'
import { resolve } from 'node:path'
import type { ExternalChangeEvent } from '../types/ipc'

type Listener = (event: ExternalChangeEvent) => void

interface Entry {
  path: string
  listeners: Set<Listener>
  timer: NodeJS.Timeout | null
  suppressedUntil: number
  lastMtime: number
  lastSize: number
}

export class FileWatcherService {
  private readonly entries = new Map<string, Entry>()
  private readonly debounceMs: number

  constructor(debounceMs = 250) {
    this.debounceMs = debounceMs
  }

  private key(path: string): string {
    return process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
  }

  watch(path: string, listener: Listener): () => void {
    const key = this.key(path)
    let entry = this.entries.get(key)
    if (!entry) {
      entry = {
        path,
        listeners: new Set(),
        timer: null,
        suppressedUntil: 0,
        lastMtime: 0,
        lastSize: 0
      }
      this.entries.set(key, entry)
      watchFile(path, { interval: 500, persistent: false }, (current, previous) => {
        this.handleChange(key, current, previous)
      })
    }
    entry.listeners.add(listener)
    return () => {
      const current = this.entries.get(key)
      if (!current) return
      current.listeners.delete(listener)
      if (current.listeners.size === 0) {
        unwatchFile(path)
        if (current.timer) clearTimeout(current.timer)
        this.entries.delete(key)
      }
    }
  }

  /** Suppress the next watcher event caused by our own atomic rename. */
  suppress(path: string, durationMs = 900): void {
    const entry = this.entries.get(this.key(path))
    if (entry) entry.suppressedUntil = Date.now() + durationMs
  }

  private handleChange(key: string, current: Stats, previous: Stats): void {
    const entry = this.entries.get(key)
    if (!entry) return
    if (Date.now() < entry.suppressedUntil) {
      entry.lastMtime = current.mtimeMs
      entry.lastSize = current.size
      return
    }
    if (
      current.mtimeMs === previous.mtimeMs &&
      current.size === previous.size &&
      current.nlink > 0
    ) {
      return
    }
    entry.lastMtime = current.mtimeMs
    entry.lastSize = current.size
    if (entry.timer) clearTimeout(entry.timer)
    entry.timer = setTimeout(() => {
      entry.timer = null
      const event: ExternalChangeEvent = {
        path: entry.path,
        mtime: current.mtimeMs,
        kind: current.nlink === 0 ? 'unlink' : 'change'
      }
      for (const listener of entry.listeners) listener(event)
    }, this.debounceMs)
  }

  closeAll(): void {
    for (const entry of this.entries.values()) {
      unwatchFile(entry.path)
      if (entry.timer) clearTimeout(entry.timer)
    }
    this.entries.clear()
  }
}
