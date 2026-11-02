import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type { FileProvider, FileInfo, ReadResult } from './FileProvider'
import { AppError } from '../utils/errors'
import { assertSafePath } from '../utils/paths'
import type { FilePayload, SaveResult } from '../types/ipc'
import type { FileWatcherService } from './FileWatcher'

export interface FileServiceOptions {
  watcher?: FileWatcherService
  onRead?: (path: string, size: number) => void
  onWrite?: (path: string, size: number) => void
}

export class FileService {
  private readonly provider: FileProvider
  private readonly watcher?: FileWatcherService
  private readonly onRead?: (path: string, size: number) => void
  private readonly onWrite?: (path: string, size: number) => void

  constructor(provider: FileProvider, options: FileServiceOptions = {}) {
    this.provider = provider
    this.watcher = options.watcher
    this.onRead = options.onRead
    this.onWrite = options.onWrite
  }

  async read(path: string): Promise<FilePayload> {
    const safe = assertSafePath(path)
    const result = await this.provider.read(safe)
    this.onRead?.(safe, result.size)
    return this.toPayload(safe, result)
  }

  async readBinary(path: string): Promise<{ path: string; dataBase64: string; size: number; mtime: number }> {
    const safe = assertSafePath(path)
    const info = await this.provider.info(safe)
    if (!info || !info.isFile) throw new AppError('FILE_NOT_FOUND', 'File not found')
    const buffer = await fs.readFile(safe)
    return { path: safe, dataBase64: buffer.toString('base64'), size: info.size, mtime: info.mtime }
  }

  async info(path: string): Promise<FileInfo | null> {
    const safe = assertSafePath(path)
    return this.provider.info(safe)
  }

  async exists(path: string): Promise<boolean> {
    try {
      const safe = assertSafePath(path)
      return await this.provider.exists(safe)
    } catch {
      return false
    }
  }

  async write(
    path: string,
    content: string,
    options: { expectedMtime?: number | null; createBackup?: boolean } = {}
  ): Promise<SaveResult> {
    const safe = assertSafePath(path)
    const current = await this.provider.info(safe)

    if (
      current &&
      options.expectedMtime !== undefined &&
      options.expectedMtime !== null &&
      Math.abs(current.mtime - options.expectedMtime) > 1000
    ) {
      return { ok: false, conflict: true, diskMtime: current.mtime, path: safe }
    }

    const result = await this.provider.write(safe, content, {
      expectedMtime: null,
      createBackup: options.createBackup
    })
    this.watcher?.suppress(safe)
    this.onWrite?.(safe, result.size)
    return { ok: true, path: safe, size: result.size, mtime: result.mtime }
  }

  private toPayload(path: string, result: ReadResult): FilePayload {
    return {
      path,
      name: basename(path),
      content: result.content,
      size: result.size,
      mtime: result.mtime,
      encoding: result.encoding,
      lineEnding: result.lineEnding
    }
  }
}
