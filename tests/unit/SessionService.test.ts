import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DEFAULT_FIND_OPTIONS, SessionService } from '../../electron/services/SessionService'
import type { SessionState, TabSnapshot, WindowBounds, SessionWindow } from '../../electron/types/ipc'

let dir: string
let file: string

function tab(overrides: Partial<TabSnapshot> = {}): TabSnapshot {
  return {
    id: 'tab-1',
    filePath: join(dir, 'note.md'),
    displayName: 'note.md',
    fileContent: '# Note',
    savedContent: '# Note',
    diskMtime: 123,
    encoding: 'utf-8',
    lineEnding: 'lf',
    isPinned: false,
    editorScrollTop: 0,
    previewScrollTop: 0,
    cursorOffset: 0,
    selectionEnd: 0,
    ...overrides
  }
}

function windowOf(tabs: TabSnapshot[], overrides: Partial<{ id: string; bounds: WindowBounds }> = {}): SessionWindow {
  return {
    id: 'window-1',
    bounds: { width: 1400, height: 900, x: 10, y: 20 },
    tabs,
    activeTabId: tabs[0]?.id ?? null,
    ...overrides
  }
}

function session(tabs: TabSnapshot[], overrides: Partial<SessionState> = {}): SessionState {
  return {
    schemaVersion: 5,
    windows: [windowOf(tabs)],
    activeWindowId: 'window-1',
    findHistory: ['TODO'],
    findOptions: { ...DEFAULT_FIND_OPTIONS },
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
    expect(await service.readSession()).toBeNull()
  })

  it('round-trips a dirty draft', async () => {
    const service = new SessionService(file)
    const input = session([tab({ filePath: join(dir, 'note.md'), diskMtime: 123 })])
    await service.writeSession(input)
    expect(await service.readSession()).toEqual(input)
  })

  it('clears the draft when it is no longer dirty', async () => {
    const service = new SessionService(file)
    const untitled = tab({ filePath: null, displayName: 'Untitled.md', fileContent: 'hello', savedContent: '' })
    await service.writeSession(session([untitled]))
    expect(await service.readSession()).toEqual(session([untitled]))
    expect(await fs.readFile(file, 'utf8')).toContain('hello')

    await service.writeSession(session([tab({ filePath: null, displayName: 'Untitled.md', fileContent: 'hello', savedContent: 'hello' })]))
    await expect(fs.access(file)).rejects.toThrow()
  })

  it('ignores malformed drafts', async () => {
    await fs.writeFile(file, '{"fileName":"Untitled.md"}')
    const service = new SessionService(file)
    expect(await service.readSession()).toBeNull()
  })

  it('ignores invalid JSON', async () => {
    await fs.writeFile(file, '{oops')
    const service = new SessionService(file)
    expect(await service.readSession()).toBeNull()
  })

  it('clear removes an existing file safely', async () => {
    const service = new SessionService(file)
    await service.writeSession(session([tab()]))
    await service.clear()
    expect(await service.readSession()).toBeNull()
    await expect(service.clear()).resolves.toBeUndefined()
  })
})