import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SessionService } from '../../electron/services/SessionService'
import type { SessionDraft } from '../../electron/types/ipc'

let dir: string
let file: string

function draft(overrides: Partial<SessionDraft> = {}): SessionDraft {
  return {
    filePath: null,
    fileName: 'Untitled.md',
    fileContent: '# Draft',
    savedContent: '',
    diskMtime: null,
    encoding: 'utf-8',
    lineEnding: 'lf',
    dirty: true,
    timestamp: 1_700_000_000_000,
    ...overrides
  }
}

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'docflow-session-'))
  file = join(dir, 'session.json')
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('SessionService', () => {
  it('returns null when no draft exists', async () => {
    const service = new SessionService(file)
    expect(await service.read()).toBeNull()
  })

  it('round-trips a dirty draft', async () => {
    const service = new SessionService(file)
    const input = draft({ filePath: join(dir, 'note.md'), diskMtime: 123 })
    await service.write(input)
    expect(await service.read()).toEqual(input)
  })

  it('clears the draft when it is no longer dirty', async () => {
    const service = new SessionService(file)
    await service.write(draft())
    expect(await fs.readFile(file, 'utf8')).toContain('# Draft')

    await service.write(draft({ dirty: false }))
    await expect(fs.access(file)).rejects.toThrow()
  })

  it('ignores malformed drafts', async () => {
    await fs.writeFile(file, '{"fileName":"Untitled.md"}')
    const service = new SessionService(file)
    expect(await service.read()).toBeNull()
  })

  it('ignores invalid JSON', async () => {
    await fs.writeFile(file, '{oops')
    const service = new SessionService(file)
    expect(await service.read()).toBeNull()
  })

  it('clear removes an existing file safely', async () => {
    const service = new SessionService(file)
    await service.write(draft())
    await service.clear()
    expect(await service.read()).toBeNull()
    await expect(service.clear()).resolves.toBeUndefined()
  })
})
