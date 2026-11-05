import { describe, expect, it, vi } from 'vitest'
import type { UpdateChannel } from '../../electron/types/ipc'
import type { Logger } from '../../electron/utils/logger'
import {
  UpdateService,
  type UpdateInfoLite,
  type UpdateProvider
} from '../../electron/services/UpdateService'

class MockProvider implements UpdateProvider {
  info: UpdateInfoLite | null = null
  configure = vi.fn()
  check = vi.fn(async () => this.info)
  download = vi.fn(async () => undefined)
  install = vi.fn()
  private progress = new Set<(percent: number) => void>()
  private downloaded = new Set<(info: { filePath: string | null; expectedSha512?: string }) => void>()
  private errors = new Set<(message: string) => void>()

  onProgress(callback: (percent: number) => void): () => void {
    this.progress.add(callback)
    return () => this.progress.delete(callback)
  }

  onDownloaded(
    callback: (info: { filePath: string | null; expectedSha512?: string }) => void
  ): () => void {
    this.downloaded.add(callback)
    return () => this.downloaded.delete(callback)
  }

  onError(callback: (message: string) => void): () => void {
    this.errors.add(callback)
    return () => this.errors.delete(callback)
  }

  emitProgress(percent: number): void {
    for (const callback of this.progress) callback(percent)
  }

  emitDownloaded(filePath: string | null, expectedSha512?: string): void {
    for (const callback of this.downloaded) callback({ filePath, expectedSha512 })
  }

  emitError(message: string): void {
    for (const callback of this.errors) callback(message)
  }
}

const logger = { warn: vi.fn(), info: vi.fn() } as unknown as Logger

function createService(
  provider: UpdateProvider | null,
  overrides: Partial<ConstructorParameters<typeof UpdateService>[0]> = {}
) {
  return new UpdateService({
    currentVersion: '1.5.0',
    provider,
    channel: 'stable',
    feedUrl: 'https://releases.docflow.app/updates',
    requireSignature: true,
    logger,
    ...overrides
  })
}

describe('UpdateService', () => {
  it('reports an available update when the feed has a newer version', async () => {
    const provider = new MockProvider()
    provider.info = { version: '1.6.0', releaseNotes: 'Tabs and i18n', files: [] }
    const service = createService(provider)

    const state = await service.checkForUpdates()
    expect(state.status).toBe('available')
    expect(state.availableVersion).toBe('1.6.0')
    expect(state.releaseNotes).toBe('Tabs and i18n')
    expect(state.lastCheckedAt).toBeTypeOf('number')
    expect(provider.configure).toHaveBeenCalledWith({
      feedUrl: 'https://releases.docflow.app/updates',
      channel: 'stable'
    })
  })

  it('returns to idle when the feed is not newer', async () => {
    const provider = new MockProvider()
    provider.info = { version: '1.5.0', files: [] }
    const service = createService(provider)
    const state = await service.checkForUpdates()
    expect(state.status).toBe('idle')
    expect(state.availableVersion).toBeNull()
  })

  it('honours skipped versions', async () => {
    const provider = new MockProvider()
    provider.info = { version: '1.6.0', releaseNotes: 'notes', files: [] }
    const service = createService(provider, { skippedVersion: '1.6.0' })
    const state = await service.checkForUpdates()
    expect(state.status).toBe('idle')
    expect(state.releaseNotes).toBe('notes')
  })

  it('works without a provider in development', async () => {
    const service = createService(null)
    const state = await service.checkForUpdates()
    expect(state.status).toBe('idle')
    expect(state.lastCheckedAt).toBeTypeOf('number')
  })

  it('downloads and transitions to ready after signature verification', async () => {
    const provider = new MockProvider()
    provider.info = { version: '1.6.0', files: [{ url: 'setup.exe', sha512: 'abc' }] }
    const verify = vi.fn(async () => ({ ok: true }))
    const service = createService(provider, { verify })

    await service.checkForUpdates()
    expect((await service.download()).status).toBe('downloading')
    provider.emitProgress(42)
    expect(service.getState().downloadProgress).toBe(42)

    provider.emitDownloaded('C:\\tmp\\setup.exe', 'abc')
    await vi.waitFor(() => expect(service.getState().status).toBe('ready'))
    expect(verify).toHaveBeenCalledWith('C:\\tmp\\setup.exe', 'abc', true)
    expect(service.getState().downloadProgress).toBe(100)

    service.install()
    expect(provider.install).toHaveBeenCalled()
  })

  it('rejects a download with an invalid signature', async () => {
    const provider = new MockProvider()
    provider.info = { version: '1.6.0', files: [] }
    const service = createService(provider, {
      verify: vi.fn(async () => ({ ok: false, reason: 'UPDATE_SIGNATURE_INVALID' }))
    })
    await service.checkForUpdates()
    await service.download()

    provider.emitDownloaded('C:\\tmp\\setup.exe', 'bad')
    await vi.waitFor(() => expect(service.getState().status).toBe('error'))
    expect(service.getState().error).toBe('UPDATE_SIGNATURE_INVALID')
    service.install()
    expect(provider.install).not.toHaveBeenCalled()
  })

  it('treats a platform-verified download without a file path as ready', async () => {
    const provider = new MockProvider()
    provider.info = { version: '1.6.0', files: [] }
    const verify = vi.fn(async () => ({ ok: false }))
    const service = createService(provider, { verify })
    await service.checkForUpdates()
    await service.download()
    provider.emitDownloaded(null)
    await vi.waitFor(() => expect(service.getState().status).toBe('ready'))
    expect(verify).not.toHaveBeenCalled()
  })

  it('switches channels and resets transient state', async () => {
    const provider = new MockProvider()
    const service = createService(provider)
    await service.checkForUpdates()
    const state = service.setChannel('beta' as UpdateChannel)
    expect(state.channel).toBe('beta')
    expect(state.status).toBe('idle')
    expect(provider.configure).toHaveBeenLastCalledWith({
      feedUrl: 'https://releases.docflow.app/updates',
      channel: 'beta'
    })
  })

  it('surfaces provider errors', async () => {
    const provider = new MockProvider()
    provider.check.mockRejectedValueOnce(new Error('OFFLINE'))
    const service = createService(provider)
    const state = await service.checkForUpdates()
    expect(state.status).toBe('error')
    expect(state.error).toBe('OFFLINE')
  })
})
