import { promises as fs } from 'node:fs'
import { lstat, realpath } from 'node:fs/promises'
import { join, relative } from 'node:path'
import fg from 'fast-glob'
import type {
  FindFileChange,
  FindInFilesInput,
  FindInFilesResponse,
  FindResult,
  ReplaceInFilesResponse
} from '../types/ipc'
import { atomicWriteText } from '../utils/atomic'
import {
  buildRegExp,
  decodeExtendedEscapes,
  findAll,
  lineColumnAt,
  lineTextAt
} from '../../src/utils/searchRegex'

export interface FileSearchOptions {
  maxResults: number
  maxFileSizeBytes: number
  timeoutMs: number
}

const DEFAULT_IGNORES = ['**/node_modules/**', '**/.git/**', '**/.svn/**', '**/dist/**', '**/release/**']

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('FIND_TIMEOUT')), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export class FileSearchService {
  private readonly options: FileSearchOptions
  private cancelled = false

  constructor(options: FileSearchOptions) {
    this.options = options
  }

  cancel(): void {
    this.cancelled = true
  }

  async search(input: FindInFilesInput): Promise<FindInFilesResponse> {
    this.cancelled = false
    const limit = Math.min(input.maxResults ?? this.options.maxResults, this.options.maxResults)
    const query = input.query
    const regex = buildRegExp(query, input.options)
    const files = await this.listFiles(input.rootDir, input.glob)
    const results: FindResult[] = []
    let truncated = false
    let filesScanned = 0

    for (const file of files) {
      if (this.cancelled) return { results, truncated, filesScanned, cancelled: true }
      try {
        const info = await lstat(file)
        if (info.isSymbolicLink() || !info.isFile()) continue
        if (info.size > this.options.maxFileSizeBytes) continue
        const content = await withTimeout(fs.readFile(file, 'utf8'), this.options.timeoutMs)
        filesScanned += 1
        const matches = findAll(content, regex)
        for (const match of matches) {
          if (results.length >= limit) {
            truncated = true
            break
          }
          const { lineNumber, columnStart } = lineColumnAt(content, match.index)
          results.push({
            filePath: file,
            lineNumber,
            columnStart,
            columnEnd: columnStart + match.length,
            preview: lineTextAt(content, match.index)
          })
        }
        if (truncated) break
      } catch (error) {
        if (error instanceof Error && error.message === 'FIND_TIMEOUT') continue
        if (error instanceof Error && error.message.startsWith('INVALID_')) throw error
        // Unreadable file (binary, permission) is skipped intentionally.
      }
    }

    return { results, truncated, filesScanned, cancelled: false }
  }

  async replaceAll(input: FindInFilesInput): Promise<ReplaceInFilesResponse> {
    this.cancelled = false
    if (input.dryRun !== true && input.dryRun !== false) {
      throw new Error('DRY_RUN_REQUIRED: preview changes before writing')
    }
    const regex = buildRegExp(input.query, input.options)
    const files = await this.listFiles(input.rootDir, input.glob)
    const changes: FindFileChange[] = []
    const writes: Array<{ path: string; content: string }> = []

    for (const file of files) {
      if (this.cancelled) return { changes, written: false, cancelled: true }
      try {
        const info = await lstat(file)
        if (info.isSymbolicLink() || !info.isFile()) continue
        if (info.size > this.options.maxFileSizeBytes) continue
        const content = await withTimeout(fs.readFile(file, 'utf8'), this.options.timeoutMs)
        const matches = findAll(content, regex)
        if (matches.length === 0) continue
        const literal =
          input.options.mode === 'extended'
            ? decodeExtendedEscapes(input.replaceWith ?? '', input.options.extendedUnicode)
            : input.replaceWith ?? ''
        const next =
          input.options.mode === 'regex'
            ? content.replace(regex, input.replaceWith ?? '')
            : content.replace(regex, () => literal)
        const diff = this.buildDiff(content, next)
        changes.push({ path: file, count: matches.length, diff })
        writes.push({ path: file, content: next })
      } catch (error) {
        if (error instanceof Error && error.message === 'FIND_TIMEOUT') continue
        if (error instanceof Error && error.message.startsWith('INVALID_')) throw error
      }
    }

    if (input.dryRun === true) {
      return { changes, written: false, cancelled: false }
    }

    for (const write of writes) {
      if (this.cancelled) return { changes, written: false, cancelled: true }
      await atomicWriteText(write.path, write.content)
    }

    return { changes, written: true, cancelled: false }
  }

  private async listFiles(rootDir: string, glob: string): Promise<string[]> {
    const root = await realpath(rootDir)
    const files = await fg(glob || '**/*.{md,markdown,txt}', {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      dot: false,
      followSymbolicLinks: false,
      ignore: DEFAULT_IGNORES,
      suppressErrors: true
    })
    return files.filter((file) => !relative(root, file).startsWith('..'))
  }

  private buildDiff(before: string, after: string): string {
    const a = before.split('\n')
    const b = after.split('\n')
    const lines: string[] = []
    const length = Math.max(a.length, b.length)
    let shown = 0
    for (let index = 0; index < length && shown < 24; index += 1) {
      if (a[index] !== b[index]) {
        if (a[index] !== undefined) lines.push(`- ${a[index]}`)
        if (b[index] !== undefined) lines.push(`+ ${b[index]}`)
        shown += 1
      }
    }
    return lines.join('\n')
  }
}

export function defaultFileSearchOptions(overrides: Partial<FileSearchOptions> = {}): FileSearchOptions {
  return {
    maxResults: 10_000,
    maxFileSizeBytes: 5 * 1024 * 1024,
    timeoutMs: 5_000,
    ...overrides
  }
}

export { join }
