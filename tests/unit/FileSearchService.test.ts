import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  defaultFileSearchOptions,
  FileSearchService
} from '../../electron/services/FileSearchService'
import { DEFAULT_FIND_OPTIONS } from '../../electron/services/SessionService'
import type { FindInFilesInput } from '../../electron/types/ipc'

let dir: string
let service: FileSearchService

function input(overrides: Partial<FindInFilesInput> = {}): FindInFilesInput {
  return {
    rootDir: dir,
    glob: '**/*.{md,markdown,txt}',
    query: 'foo',
    options: { ...DEFAULT_FIND_OPTIONS },
    dryRun: true,
    ...overrides
  }
}

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'docflow-find-'))
  service = new FileSearchService(defaultFileSearchOptions())
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('FileSearchService', () => {
  it('finds matches across files with line and column metadata', async () => {
    await fs.writeFile(join(dir, 'a.md'), '# A\nfoo one\n')
    await fs.writeFile(join(dir, 'b.txt'), 'foo two\n')
    await fs.writeFile(join(dir, 'skip.json'), 'foo ignored\n')

    const response = await service.search(input())
    expect(response.cancelled).toBe(false)
    expect(response.filesScanned).toBe(2)
    expect(response.results).toHaveLength(2)
    const [first] = response.results.sort((a, b) => a.filePath.localeCompare(b.filePath))
    expect(first.lineNumber).toBe(2)
    expect(first.columnStart).toBe(1)
    expect(first.preview).toContain('foo one')
  })

  it('supports regex and match case', async () => {
    await fs.writeFile(join(dir, 'headings.md'), '# One\n## Two\n### Three\n')
    const response = await service.search(
      input({
        query: '^#{1,2}\\s+.+$',
        options: { ...DEFAULT_FIND_OPTIONS, mode: 'regex' }
      })
    )
    expect(response.results.map((result) => result.lineNumber)).toEqual([1, 2])
  })

  it('previews replacements without writing files', async () => {
    await fs.writeFile(join(dir, 'a.md'), 'foo foo\n')
    const response = await service.replaceAll(input({ replaceWith: 'DONE' }))

    expect(response.written).toBe(false)
    expect(response.changes).toHaveLength(1)
    expect(response.changes[0].count).toBe(2)
    expect(response.changes[0].diff).toContain('- foo foo')
    expect(await fs.readFile(join(dir, 'a.md'), 'utf8')).toBe('foo foo\n')
  })

  it('writes replacement changes when dryRun is false', async () => {
    await fs.writeFile(join(dir, 'a.md'), 'foo foo\n')
    const response = await service.replaceAll(input({ replaceWith: 'DONE', dryRun: false }))

    expect(response.written).toBe(true)
    expect(response.changes).toHaveLength(1)
    expect(response.changes[0].count).toBe(2)
    expect(response.changes[0].diff).toContain('- foo foo')
    expect(await fs.readFile(join(dir, 'a.md'), 'utf8')).toBe('DONE DONE\n')
  })

  it('keeps replacement text literal in normal and extended modes', async () => {
    await fs.writeFile(join(dir, 'a.md'), 'foo\n')
    const response = await service.replaceAll(input({ replaceWith: '$&bar', dryRun: false }))

    expect(response.written).toBe(true)
    expect(response.changes).toHaveLength(1)
    expect(response.changes[0].count).toBe(1)
    expect(response.changes[0].diff).toContain('- foo')
    expect(await fs.readFile(join(dir, 'a.md'), 'utf8')).toBe('$&bar\n')
  })

  it('requires an explicit dry-run flag for replace-in-files', async () => {
    await fs.writeFile(join(dir, 'a.md'), 'foo\n')
    await expect(
      service.replaceAll({
        ...input({ replaceWith: 'DONE' }),
        dryRun: undefined
      })
    ).rejects.toThrow(/DRY_RUN_REQUIRED/)
  })

  it('respects maxResults and reports truncation', async () => {
    await fs.writeFile(join(dir, 'many.md'), 'foo\n'.repeat(5))
    const response = await service.search(input({ maxResults: 2 }))
    expect(response.results).toHaveLength(2)
    expect(response.truncated).toBe(true)
  })

  it('skips files larger than the configured limit', async () => {
    await fs.writeFile(join(dir, 'large.md'), 'x'.repeat(200))
    const small = new FileSearchService(defaultFileSearchOptions({ maxFileSizeBytes: 50 }))
    const response = await small.search(input())
    expect(response.results).toHaveLength(0)
    expect(response.filesScanned).toBe(0)
  })

  it('rejects invalid regex patterns instead of crashing', async () => {
    await fs.writeFile(join(dir, 'a.md'), 'text\n')
    await expect(
      service.search(input({ query: '(unclosed', options: { ...DEFAULT_FIND_OPTIONS, mode: 'regex' } }))
    ).rejects.toThrow(/INVALID_REGEX/)
  })
})