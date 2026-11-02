import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  DEFAULT_SETTINGS,
  SettingsService
} from '../../electron/services/SettingsService'

let dir: string
let file: string

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'docflow-settings-'))
  file = join(dir, 'settings.json')
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('SettingsService', () => {
  it('uses defaults when no settings file exists', async () => {
    const service = new SettingsService(file)
    await service.init()
    expect(service.all()).toEqual(DEFAULT_SETTINGS)
  })

  it('migrates unversioned settings and fills missing fields', async () => {
    await fs.writeFile(file, JSON.stringify({ theme: 'legal', windowBounds: { width: 1200 } }))
    const service = new SettingsService(file)
    await service.init()

    const values = service.all()
    expect(values.schemaVersion).toBe(1)
    expect(values.theme).toBe('legal')
    expect(values.windowBounds).toEqual({ ...DEFAULT_SETTINGS.windowBounds, width: 1200 })
    expect(values.pageSize).toBe('A4')
  })

  it('falls back to defaults for invalid stored settings', async () => {
    await fs.writeFile(file, JSON.stringify({ theme: 'neon', schemaVersion: 1 }))
    const service = new SettingsService(file)
    await service.init()
    expect(service.all()).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial window bounds on set', async () => {
    const service = new SettingsService(file)
    await service.init()
    const values = await service.set({ windowBounds: { width: 1600, height: 1000, x: 20, y: 30 } })
    expect(values.windowBounds).toEqual({ width: 1600, height: 1000, x: 20, y: 30 })
    expect(values.theme).toBe(DEFAULT_SETTINGS.theme)
  })

  it('rejects invalid patches without changing values', async () => {
    const service = new SettingsService(file)
    await service.init()
    await expect(service.set({ fontSize: 'huge' as never })).rejects.toThrow(/Invalid settings/)
    expect(service.get('fontSize')).toBe(DEFAULT_SETTINGS.fontSize)
  })

  it('ignores attempts to change the schema version', async () => {
    const service = new SettingsService(file)
    await service.init()
    const values = await service.set({ schemaVersion: 99 })
    expect(values.schemaVersion).toBe(1)
  })

  it('persists changes and reloads them', async () => {
    const first = new SettingsService(file)
    await first.init()
    await first.set({ theme: 'editorial', justifyText: true })
    await first.flush()

    const second = new SettingsService(file)
    await second.init()
    expect(second.get('theme')).toBe('editorial')
    expect(second.get('justifyText')).toBe(true)
  })

  it('reset keeps the current window bounds', async () => {
    const service = new SettingsService(file)
    await service.init()
    await service.set({
      theme: 'legal',
      windowBounds: { width: 1500, height: 950, x: 1, y: 2 }
    })
    const reset = await service.reset()
    expect(reset.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(reset.windowBounds).toEqual({ width: 1500, height: 950, x: 1, y: 2 })
  })

  it('tolerates a corrupt settings file', async () => {
    await fs.writeFile(file, 'not-json')
    const service = new SettingsService(file)
    await service.init()
    expect(service.all()).toEqual(DEFAULT_SETTINGS)
  })
})
