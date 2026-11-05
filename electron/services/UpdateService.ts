import type { UpdateChannel, UpdateState } from '../types/ipc'
import type { Logger } from '../utils/logger'
import { isNewerVersion, verifyArtifactDigest } from '../utils/signature'

export interface UpdateFileInfo {
  url: string
  sha512?: string
  size?: number
}

export interface UpdateInfoLite {
  version: string
  releaseNotes?: string | null
  files?: UpdateFileInfo[]
}

export interface UpdateProvider {
  configure(options: { feedUrl: string; channel: UpdateChannel }): void
  check(): Promise<UpdateInfoLite | null>
  download(): Promise<void>
  install(): void
  onProgress(callback: (percent: number) => void): () => void
  onDownloaded(
    callback: (info: { filePath: string | null; expectedSha512?: string }) => void
  ): () => void
  onError(callback: (message: string) => void): () => void
}

export interface UpdateServiceOptions {
  currentVersion: string
  provider: UpdateProvider | null
  channel: UpdateChannel
  feedUrl: string
  requireSignature: boolean
  logger: Logger
  onStateChanged?: (state: UpdateState) => void
  verify?: (filePath: string, expectedSha512: string | undefined, required: boolean) => Promise<{ ok: boolean; reason?: string }>
  skippedVersion?: string | null
}

function initialState(channel: UpdateChannel): UpdateState {
  return {
    status: 'idle',
    availableVersion: null,
    downloadProgress: 0,
    releaseNotes: null,
    lastCheckedAt: null,
    channel,
    error: null,
    skippedVersion: null
  }
}

export class UpdateService {
  private readonly options: UpdateServiceOptions
  private state: UpdateState
  private provider: UpdateProvider | null
  private pendingInfo: UpdateInfoLite | null = null
  private unsubscribers: Array<() => void> = []

  constructor(options: UpdateServiceOptions) {
    this.options = options
    this.provider = options.provider
    this.state = { ...initialState(options.channel), skippedVersion: options.skippedVersion ?? null }
    this.attachProvider()
  }

  getState(): UpdateState {
    return structuredClone(this.state)
  }

  setProvider(provider: UpdateProvider | null): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe()
    this.unsubscribers = []
    this.provider = provider
    this.attachProvider()
  }

  setChannel(channel: UpdateChannel): UpdateState {
    this.state = { ...this.state, channel, status: 'idle', downloadProgress: 0 }
    this.configureProvider()
    this.emit()
    return this.getState()
  }

  setSkippedVersion(version: string | null): void {
    this.state = { ...this.state, skippedVersion: version }
    this.emit()
  }

  async checkForUpdates(): Promise<UpdateState> {
    if (!this.provider) {
      this.state = {
        ...this.state,
        status: 'idle',
        lastCheckedAt: Date.now(),
        error: null
      }
      this.emit()
      return this.getState()
    }
    this.state = { ...this.state, status: 'checking', error: null }
    this.emit()
    try {
      const info = await this.provider.check()
      const now = Date.now()
      if (!info || !isNewerVersion(info.version, this.options.currentVersion)) {
        this.state = {
          ...this.state,
          status: 'idle',
          availableVersion: null,
          releaseNotes: null,
          lastCheckedAt: now,
          error: null
        }
        this.emit()
        return this.getState()
      }
      this.pendingInfo = info
      if (this.state.skippedVersion === info.version) {
        this.state = {
          ...this.state,
          status: 'idle',
          availableVersion: null,
          releaseNotes: info.releaseNotes ?? null,
          lastCheckedAt: now
        }
        this.emit()
        return this.getState()
      }
      this.state = {
        ...this.state,
        status: 'available',
        availableVersion: info.version,
        releaseNotes: info.releaseNotes ?? null,
        lastCheckedAt: now,
        error: null
      }
      this.emit()
      return this.getState()
    } catch (error) {
      this.fail(error)
      return this.getState()
    }
  }

  async download(): Promise<UpdateState> {
    if (!this.provider || !this.pendingInfo || this.state.status === 'downloading') {
      return this.getState()
    }
    this.state = { ...this.state, status: 'downloading', downloadProgress: 0, error: null }
    this.emit()
    try {
      await this.provider.download()
      return this.getState()
    } catch (error) {
      this.fail(error)
      return this.getState()
    }
  }

  install(): UpdateState {
    if (this.state.status !== 'ready' || !this.provider) return this.getState()
    this.provider.install()
    return this.getState()
  }

  cancel(): UpdateState {
    if (this.state.status === 'checking' || this.state.status === 'downloading') {
      this.state = { ...this.state, status: 'idle', downloadProgress: 0 }
      this.emit()
    }
    return this.getState()
  }

  private configureProvider(): void {
    try {
      this.provider?.configure({ feedUrl: this.options.feedUrl, channel: this.state.channel })
    } catch (error) {
      this.options.logger.warn('Updater configuration failed', error instanceof Error ? error.message : String(error))
    }
  }

  private attachProvider(): void {
    if (!this.provider) return
    this.configureProvider()
    this.unsubscribers.push(
      this.provider.onProgress((percent) => {
        const bounded = Math.max(0, Math.min(100, Math.round(percent)))
        this.state = { ...this.state, status: 'downloading', downloadProgress: bounded }
        this.emit()
      })
    )
    this.unsubscribers.push(
      this.provider.onDownloaded((info) => {
        void this.handleDownloaded(info.filePath, info.expectedSha512)
      })
    )
    this.unsubscribers.push(
      this.provider.onError((message) => {
        this.fail(new Error(message))
      })
    )
  }

  private async handleDownloaded(filePath: string | null, expectedSha512: string | undefined): Promise<void> {
    const verify = this.options.verify ?? verifyArtifactDigest
    if (!filePath) {
      // The platform updater already verified the signature internally.
      this.state = { ...this.state, status: 'ready', downloadProgress: 100, error: null }
      this.emit()
      return
    }
    const result = await verify(filePath, expectedSha512, this.options.requireSignature)
    if (!result.ok) {
      this.options.logger.warn('Update signature rejected', result.reason ?? 'unknown')
      this.state = {
        ...this.state,
        status: 'error',
        error: result.reason ?? 'UPDATE_SIGNATURE_INVALID',
        downloadProgress: 0
      }
      this.emit()
      return
    }
    this.state = { ...this.state, status: 'ready', downloadProgress: 100, error: null }
    this.emit()
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.options.logger.warn('Update operation failed', message)
    this.state = { ...this.state, status: 'error', error: message, downloadProgress: 0 }
    this.emit()
  }

  private emit(): void {
    this.options.onStateChanged?.(this.getState())
  }
}
