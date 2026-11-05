import type { UpdateChannel } from '../types/ipc'
import type { UpdateInfoLite, UpdateProvider } from './UpdateService'

/**
 * Adapter around electron-updater. The dependency is loaded lazily so unit
 * tests and renderer builds never touch the native updater module.
 */
export class ElectronUpdaterProvider implements UpdateProvider {
  private lastInfo: UpdateInfoLite | null = null
  private progressCallbacks = new Set<(percent: number) => void>()
  private downloadedCallbacks = new Set<(info: { filePath: string | null; expectedSha512?: string }) => void>()
  private errorCallbacks = new Set<(message: string) => void>()
  private attached = false
  private updater: any = null
  private feedUrl = ''
  private channel: UpdateChannel = 'stable'

  async ensureLoaded(): Promise<boolean> {
    if (this.updater) return true
    try {
      const module = await import('electron-updater')
      this.updater = module.autoUpdater
      this.attachEvents()
      return true
    } catch {
      return false
    }
  }

  configure(options: { feedUrl: string; channel: UpdateChannel }): void {
    this.feedUrl = options.feedUrl
    this.channel = options.channel
    if (!this.updater) return
    try {
      this.updater.autoDownload = false
      this.updater.autoInstallOnAppQuit = false
      this.updater.allowDowngrade = false
      this.updater.channel = this.channel
      this.updater.setFeedURL({
        provider: 'generic',
        url: `${this.feedUrl.replace(/\/+$/, '')}/${this.channel}`
      })
    } catch {
      // Configuration is retried on the next check; an offline feed is non-fatal.
    }
  }

  async check(): Promise<UpdateInfoLite | null> {
    if (!(await this.ensureLoaded())) return null
    if (this.feedUrl) {
      this.configure({ feedUrl: this.feedUrl, channel: this.channel })
    }
    const result = await this.updater.checkForUpdates()
    const info = result?.updateInfo
    if (!info) return null
    this.lastInfo = {
      version: String(info.version),
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
      files: Array.isArray(info.files)
        ? info.files.map((file: { url?: string; sha512?: string; size?: number }) => ({
            url: String(file.url ?? ''),
            sha512: file.sha512,
            size: file.size
          }))
        : []
    }
    return this.lastInfo
  }

  async download(): Promise<void> {
    if (!(await this.ensureLoaded())) throw new Error('UPDATER_UNAVAILABLE')
    await this.updater.downloadUpdate()
  }

  install(): void {
    if (!this.updater) return
    this.updater.quitAndInstall(false, true)
  }

  onProgress(callback: (percent: number) => void): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  onDownloaded(
    callback: (info: { filePath: string | null; expectedSha512?: string }) => void
  ): () => void {
    this.downloadedCallbacks.add(callback)
    return () => this.downloadedCallbacks.delete(callback)
  }

  onError(callback: (message: string) => void): () => void {
    this.errorCallbacks.add(callback)
    return () => this.errorCallbacks.delete(callback)
  }

  private attachEvents(): void {
    if (!this.updater || this.attached) return
    this.attached = true
    this.updater.on('download-progress', (progress: { percent?: number }) => {
      for (const callback of this.progressCallbacks) callback(progress.percent ?? 0)
    })
    this.updater.on(
      'update-downloaded',
      (event: { downloadedFile?: string; version?: string } | undefined) => {
        const filePath = event?.downloadedFile ?? null
        const expectedSha512 = this.lastInfo?.files?.find((file) => file.sha512)?.sha512
        for (const callback of this.downloadedCallbacks) callback({ filePath, expectedSha512 })
      }
    )
    this.updater.on('error', (error: Error) => {
      for (const callback of this.errorCallbacks) callback(error.message)
    })
  }
}
