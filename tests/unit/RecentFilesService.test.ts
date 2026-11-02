import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { RecentFilesService } from '../../electron/services/RecentFilesService'

let dir: string
let file: string
let now = 1_700_000_000_000

function makeService(max = 10, ttlDays = 90): RecentFilesService {
  return new RecentFilesService(file, { max, ttlDays })
}

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'docflow-recent-'))
  file = join(dir, 'recent.json')
  now = 1_700_000_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(dir, { recursive: true, force: true })
})

describe('RecentFilesService', () => {
  it('adds files and returns newest first', async () => {
    const service = makeService()
    await service.init()
    now += 1000
    await service.add({ path: join(dir, 'a.md'), size: 10 })
    now += 1000
    await service.add({ path: join(dir, 'b.md'), size: 20 })

    const list = service.list()
    expect(list).toHaveLength(2)
    expect(list[0].displayName).toBe('b.md')
    expect(list[1].displayName).toBe('a.md')
    expect(list[0].size).toBe(20)
  })

  it('updates an existing path instead of duplicating it', async () => {
    const service = makeService()
    await service.init()
    const path = join(dir, 'note.md')
    await service.add({ path, size: 1 })
    now += 5000
    await service.add({ path, displayName: 'Renamed.md', size: 99 })

    const list = service.list()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ displayName: 'Renamed.md', size: 99, lastOpenedAt: now })
  })

  it('persists entries across instances', async () => {
    const first = makeService()
    await first.init()
    await first.add({ path: join(dir, 'persisted.md'), size: 5 })

    const second = makeService()
    await second.init()
    expect(second.list()).toHaveLength(1)
    expect(second.list()[0].path).toBe(join(dir, 'persisted.md'))
  })

  it('keeps pinned entries when the unpinned cap is exceeded', async () => {
    const service = makeService(2)
    await service.init()
    const pinnedPath = join(dir, 'pinned.md')
    await service.add({ path: pinnedPath })
    await service.togglePin(pinnedPath)
    for (const name of ['a.md', 'b.md', 'c.md']) {
      now += 1000
      await service.add({ path: join(dir, name) })
    }

    const list = service.list()
    expect(list.filter((item) => item.pinned)).toHaveLength(1)
    expect(list.filter((item) => !item.pinned)).toHaveLength(2)
  })

  it('prunes expired unpinned entries on init', async () => {
    const stale = now - 200 * 24 * 60 * 60 * 1000
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        files: [
          { path: join(dir, 'old.md'), displayName: 'old.md', lastOpenedAt: stale, size: 0, pinned: false },
          { path: join(dir, 'pinned.md'), displayName: 'pinned.md', lastOpenedAt: stale, size: 0, pinned: true }
        ]
      })
    )

    const service = makeService(10, 90)
    await service.init()
    expect(service.list().map((item) => item.displayName)).toEqual(['pinned.md'])
  })

  it('clears unpinned entries by default and everything when asked', async () => {
    const service = makeService()
    await service.init()
    const pinnedPath = join(dir, 'pinned.md')
    await service.add({ path: pinnedPath })
    await service.togglePin(pinnedPath)
    await service.add({ path: join(dir, 'plain.md') })

    expect(await service.clear()).toHaveLength(1)
    expect(await service.clear(false)).toHaveLength(0)
  })

  it('removes a single entry', async () => {
    const service = makeService()
    await service.init()
    const path = join(dir, 'gone.md')
    await service.add({ path })
    const list = await service.remove(path)
    expect(list).toEqual([])
  })

  it('notifies listeners about changes', async () => {
    const service = makeService()
    const listener = vi.fn()
    service.setChangeListener(listener)
    await service.init()
    await service.add({ path: join(dir, 'note.md') })
    expect(listener).toHaveBeenCalled()
  })

  it('treats paths case-insensitively on Windows', async () => {
    if (process.platform !== 'win32') return
    const service = makeService()
    await service.init()
    await service.add({ path: join(dir, 'Case.md') })
    await service.add({ path: join(dir, 'case.md') })
    expect(service.list()).toHaveLength(1)
  })

  it('falls back to defaults when the store is corrupt', async () => {
    await fs.writeFile(file, '{not json')
    const service = makeService()
    await service.init()
    expect(service.list()).toEqual([])
  })
})
