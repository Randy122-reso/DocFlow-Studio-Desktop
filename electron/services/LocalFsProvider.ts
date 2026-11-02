import { promises as fs, watchFile, unwatchFile, type Stats } from 'node:fs'
import { basename, isAbsolute } from 'node:path'
import type { FileInfo, FileProvider, ReadResult, Watcher, WriteOptions, WriteResult } from './FileProvider'
import type { TextEncoding } from '../types/ipc'
import { decodeText, detectLineEnding, encodeText } from '../utils/encoding'
import { atomicWriteFile } from '../utils/atomic'
import { AppError } from '../utils/errors'

export interface LocalFsProviderOptions {
  maxFileSizeBytes: number
  defaultEncoding: TextEncoding
}

export class LocalFsProvider implements FileProvider {
  readonly id = 'local'
  private readonly maxFileSizeBytes: number
  private readonly defaultEncoding: TextEncoding

  constructor(options: LocalFsProviderOptions) {
    this.maxFileSizeBytes = options.maxFileSizeBytes
    this.defaultEncoding = options.defaultEncoding
  }

  canHandle(path: string): boolean {
    return isAbsolute(path) && !path.includes('\0')
  }

  async read(path: string): Promise<ReadResult> {
    if (!this.canHandle(path)) {
      throw new AppError('FILE_UNSUPPORTED', `Unsupported path: ${path}`)
    }
    let stats
    try {
      stats = await fs.stat(path)
    } catch {
      throw new AppError('FILE_NOT_FOUND', `File not found: ${basename(path)}`)
    }
    if (!stats.isFile()) {
      throw new AppError('FILE_UNSUPPORTED', 'The selected path is not a file')
    }
    if (stats.size > this.maxFileSizeBytes) {
      throw new AppError(
        'FILE_TOO_LARGE',
        `File is larger than ${Math.round(this.maxFileSizeBytes / 1024 / 1024)} MB`
      )
    }
    const buffer = await fs.readFile(path)
    const decoded = decodeText(buffer)
    return {
      content: decoded.content,
      size: stats.size,
      mtime: stats.mtimeMs,
      encoding: decoded.encoding,
      lineEnding: decoded.lineEnding
    }
  }

  async write(path: string, content: string, options: WriteOptions = {}): Promise<WriteResult> {
    if (!this.canHandle(path)) {
      throw new AppError('FILE_UNSUPPORTED', `Unsupported path: ${path}`)
    }

    const existing = await this.safeStat(path)
    if (existing && options.expectedMtime !== undefined && options.expectedMtime !== null) {
      if (Math.abs(existing.mtimeMs - options.expectedMtime) > 1000) {
        return { path, size: existing.size, mtime: existing.mtimeMs }
      }
    }

    if (existing && existing.size <= this.maxFileSizeBytes) {
      try {
        const current = await fs.readFile(path)
        const decoded = decodeText(current)
        if (decoded.content === content) {
          return { path, size: existing.size, mtime: existing.mtimeMs }
        }
      } catch {
        // Continue with the write; idempotency check is best effort.
      }
    }

    if (options.createBackup && existing) {
      await fs.copyFile(path, `${path}.bak`).catch(() => undefined)
    }

    const encoding = options.encoding ?? this.defaultEncoding
    const encoded = encodeText(content, encoding)
    await atomicWriteFile(path, encoded)
    const stats = await fs.stat(path)
    return { path, size: stats.size, mtime: stats.mtimeMs }
  }

  async info(path: string): Promise<FileInfo | null> {
    try {
      const [stats, link] = await Promise.all([fs.stat(path), fs.lstat(path)])
      return {
        path,
        size: stats.size,
        mtime: stats.mtimeMs,
        isFile: stats.isFile(),
        isSymlink: link.isSymbolicLink()
      }
    } catch {
      return null
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  }

  async watch(path: string): Promise<Watcher> {
    const listeners = new Map<string, Set<(path: string) => void>>()
    const emit = (event: string, currentPath: string) => {
      for (const listener of listeners.get(event) ?? []) listener(currentPath)
    }
    const handler = (current: Stats, previous: Stats) => {
      if (current.mtimeMs === previous.mtimeMs && current.size === previous.size && current.nlink > 0) return
      if (current.nlink === 0) emit('unlink', path)
      else emit('change', path)
    }
    watchFile(path, { interval: 500, persistent: false }, handler)
    const watcher: Watcher = {
      close: async () => {
        unwatchFile(path, handler)
        listeners.clear()
      },
      on: (event, callback) => {
        const set = listeners.get(event) ?? new Set()
        set.add(callback)
        listeners.set(event, set)
      }
    }
    return watcher
  }

  private async safeStat(path: string): Promise<Stats | null> {
    try {
      return await fs.stat(path)
    } catch {
      return null
    }
  }

  detectLineEnding(content: string): 'lf' | 'crlf' | 'cr' {
    return detectLineEnding(content)
  }
}
