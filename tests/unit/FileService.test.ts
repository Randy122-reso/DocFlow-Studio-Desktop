import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { FileService } from '../../electron/services/FileService'
import { LocalFsProvider } from '../../electron/services/LocalFsProvider'
import type {
  FileInfo,
  FileProvider,
  ReadResult,
  WriteOptions,
  WriteResult
} from '../../electron/services/FileProvider'
import type { FileWatcherService } from '../../electron/services/FileWatcher'
import { AppError } from '../../electron/utils/errors'

vi.mock('electron', () => ({
  app: { getPath: () => process.cwd() }
}))

interface MemoryEntry {
  content: string
  mtime: number
}

class MemoryProvider implements FileProvider {
  readonly id = 'memory'
  readonly files = new Map<string, MemoryEntry>()
  readonly writeOptions: WriteOptions[] = []
  private clock = 1_000

  canHandle(): boolean {
    return true
  }

  async read(path: string): Promise<ReadResult> {
    const entry = this.files.get(path)
    if (!entry) throw new AppError('FILE_NOT_FOUND', 'File not found')
    return {
      content: entry.content,
      size: Buffer.byteLength(entry.content, 'utf8'),
      mtime: entry.mtime,
      encoding: 'utf-8',
      lineEnding: 'lf'
    }
  }

  async write(path: string, content: string, opts?: WriteOptions): Promise<WriteResult> {
    this.writeOptions.push(opts ?? {})
    this.clock += 1
    this.files.set(path, { content, mtime: this.clock })
    return { path, size: Buffer.byteLength(content, 'utf8'), mtime: this.clock }
  }

  async info(path: string): Promise<FileInfo | null> {
    const entry = this.files.get(path)
    if (!entry) return null
    return {
      path,
      size: Buffer.byteLength(entry.content, 'utf8'),
      mtime: entry.mtime,
      isFile: true,
      isSymlink: false
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async watch(): Promise<never> {
    throw new Error('not implemented')
  }
}

function makeWatcher(): { watcher: FileWatcherService; suppress: ReturnType<typeof vi.fn> } {
  const suppress = vi.fn()
  return { watcher: { suppress } as unknown as FileWatcherService, suppress }
}

let provider: MemoryProvider
let documentPath: string

beforeEach(() => {
  provider = new MemoryProvider()
  documentPath = resolve(process.cwd(), 'fixtures', 'note.md')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FileService', () => {
  it('reads a payload with a basename and metadata', async () => {
    provider.files.set(documentPath, { content: '# Hello', mtime: 1234 })
    const onRead = vi.fn()
    const service = new FileService(provider, { onRead })

    const payload = await service.read(documentPath)
    expect(payload).toMatchObject({
      name: basename(documentPath),
      content: '# Hello',
      size: 7,
      mtime: 1234,
      encoding: 'utf-8',
      lineEnding: 'lf'
    })
    expect(onRead).toHaveBeenCalledWith(documentPath, 7)
  })

  it('propagates provider read errors', async () => {
    const service = new FileService(provider)
    await expect(service.read(documentPath)).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' })
  })

  it('rejects relative or traversing paths', async () => {
    const service = new FileService(provider)
    await expect(service.read('../secret.md')).rejects.toMatchObject({ code: 'PATH_TRAVERSAL' })
    expect(await service.exists('../secret.md')).toBe(false)
  })

  it('writes when there is no expected mtime', async () => {
    const onWrite = vi.fn()
    const { watcher, suppress } = makeWatcher()
    const service = new FileService(provider, { watcher, onWrite })

    const result = await service.write(documentPath, '# Saved')
    expect(result.ok).toBe(true)
    expect(result.path).toBe(documentPath)
    expect(onWrite).toHaveBeenCalledWith(documentPath, 7)
    expect(suppress).toHaveBeenCalledWith(documentPath)
    expect(provider.files.get(documentPath)?.content).toBe('# Saved')
  })

  it('detects a conflict when the disk mtime moved beyond tolerance', async () => {
    provider.files.set(documentPath, { content: 'disk', mtime: 10_000 })
    const { watcher, suppress } = makeWatcher()
    const service = new FileService(provider, { watcher })

    const result = await service.write(documentPath, 'local', { expectedMtime: 5_000 })
    expect(result).toEqual({ ok: false, conflict: true, diskMtime: 10_000, path: documentPath })
    expect(provider.files.get(documentPath)?.content).toBe('disk')
    expect(suppress).not.toHaveBeenCalled()
  })

  it('allows writes within the one-second mtime tolerance', async () => {
    provider.files.set(documentPath, { content: 'disk', mtime: 10_000 })
    const service = new FileService(provider)
    const result = await service.write(documentPath, 'local', { expectedMtime: 9_500 })
    expect(result.ok).toBe(true)
    expect(provider.files.get(documentPath)?.content).toBe('local')
  })

  it('skips conflict checks for a null expected mtime and forwards backups', async () => {
    provider.files.set(documentPath, { content: 'disk', mtime: 10_000 })
    const service = new FileService(provider)
    await service.write(documentPath, 'local', { expectedMtime: null, createBackup: true })
    expect(provider.writeOptions.at(-1)).toMatchObject({
      createBackup: true,
      expectedMtime: null
    })
  })

  it('reports file info and existence', async () => {
    provider.files.set(documentPath, { content: 'abc', mtime: 42 })
    const service = new FileService(provider)
    expect(await service.info(documentPath)).toMatchObject({ size: 3, mtime: 42, isFile: true })
    expect(await service.exists(documentPath)).toBe(true)
    expect(await service.exists(resolve(process.cwd(), 'missing.md'))).toBe(false)
  })

  it('reads binary data as base64', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'docflow-file-'))
    const binary = join(dir, 'doc.pdf')
    await fs.writeFile(binary, Buffer.from([1, 2, 3, 4]))
    try {
      const service = new FileService(
        new LocalFsProvider({ maxFileSizeBytes: 10 * 1024 * 1024, defaultEncoding: 'utf-8' })
      )
      const result = await service.readBinary(binary)
      expect(result.dataBase64).toBe(Buffer.from([1, 2, 3, 4]).toString('base64'))
      expect(result.size).toBe(4)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('rejects binary reads for unknown files', async () => {
    const service = new FileService(provider)
    await expect(
      service.readBinary(resolve(process.cwd(), 'missing.pdf'))
    ).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' })
  })
})
