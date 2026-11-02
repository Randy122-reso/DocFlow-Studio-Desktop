import type { TextEncoding } from '../types/ipc'

export interface ReadResult {
  content: string
  size: number
  mtime: number
  encoding: TextEncoding
  lineEnding: 'lf' | 'crlf' | 'cr'
}

export interface WriteOptions {
  encoding?: TextEncoding
  expectedMtime?: number | null
  createBackup?: boolean
}

export interface WriteResult {
  path: string
  size: number
  mtime: number
}

export interface FileInfo {
  path: string
  size: number
  mtime: number
  isFile: boolean
  isSymlink: boolean
}

export interface Watcher {
  close(): Promise<void>
  on(event: 'change' | 'unlink' | 'error', cb: (path: string) => void): void
}

export interface FileProvider {
  readonly id: string
  canHandle(path: string): boolean
  read(path: string): Promise<ReadResult>
  write(path: string, content: string, opts?: WriteOptions): Promise<WriteResult>
  info(path: string): Promise<FileInfo | null>
  exists(path: string): Promise<boolean>
  watch(path: string): Promise<Watcher>
}
