import { dirname } from 'node:path'
import { atomicWriteFile } from '../utils/atomic'
import type { AppConfig } from '../utils/config'
import type { Logger } from '../utils/logger'
import type { FileService } from '../services/FileService'
import type { FileWatcherService } from '../services/FileWatcher'
import type { DialogService } from '../services/DialogService'
import type { SettingsService } from '../services/SettingsService'
import type { ExternalChangeEvent, FileFilter } from '../types/ipc'
import { assertSafePath } from '../utils/paths'
import { DialogService as DialogHelper } from '../services/DialogService'
import { registerHandler } from './handle'
import {
  binaryPathSchema,
  pathInputSchema,
  saveAsSchema,
  saveDialogSchema,
  saveSchema
} from './schemas'

export interface FileHandlerDeps {
  fileService: FileService
  watcher: FileWatcherService
  dialogs: DialogService
  settings: SettingsService
  config: AppConfig
  logger: Logger
  getWindow: () => Electron.BrowserWindow | null
}

const DEFAULT_TEXT_FILTERS: FileFilter[] = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
  { name: 'All Files', extensions: ['*'] }
]

export function registerFileHandlers(deps: FileHandlerDeps): void {
  const unwatchers = new Map<string, () => void>()

  const readPath = async (path: string) => {
    const payload = await deps.fileService.read(path)
    await deps.settings.set({ lastOpenedDir: dirname(payload.path) })
    deps.dialogs.setLastOpenedDir(dirname(payload.path))
    return { cancelled: false as const, ...payload }
  }

  registerHandler('file:openDialog', null, deps.logger, async () => {
    const path = await deps.dialogs.openFile(deps.getWindow())
    if (!path) return { cancelled: true as const }
    return readPath(path)
  })

  registerHandler('file:openPath', pathInputSchema, deps.logger, async ({ path }) => readPath(path))

  registerHandler('file:read', pathInputSchema, deps.logger, async ({ path }) => readPath(path))

  registerHandler('file:save', saveSchema, deps.logger, async ({ path, content, expectedMtime, createBackup }) => {
    const result = await deps.fileService.write(path, content, { expectedMtime, createBackup })
    if (result.ok && result.path) {
      deps.logger.fileEvent('file:save', result.path, result.size)
      await deps.settings.set({ lastOpenedDir: dirname(result.path) })
    }
    return result
  })

  registerHandler('file:saveAs', saveAsSchema, deps.logger, async ({ content, defaultName, filters }) => {
    const target = await deps.dialogs.saveFile(deps.getWindow(), {
      defaultName,
      filters: DialogHelper.filtersFrom(filters, DEFAULT_TEXT_FILTERS)
    })
    if (!target) return { cancelled: true as const }
    const result = await deps.fileService.write(target, content, { expectedMtime: null })
    if (result.ok && result.path) {
      deps.logger.fileEvent('file:saveAs', result.path, result.size)
      await deps.settings.set({ lastOpenedDir: dirname(result.path) })
      deps.dialogs.setLastOpenedDir(dirname(result.path))
    }
    return { cancelled: false as const, ...result }
  })

  registerHandler('file:saveDialog', saveDialogSchema, deps.logger, async ({ defaultName, filters }) => {
    const target = await deps.dialogs.saveFile(deps.getWindow(), {
      defaultName,
      filters: DialogHelper.filtersFrom(filters, DEFAULT_TEXT_FILTERS)
    })
    return target ? { cancelled: false as const, path: target } : { cancelled: true as const }
  })

  registerHandler('file:info', pathInputSchema, deps.logger, async ({ path }) => deps.fileService.info(path))

  registerHandler('file:exists', pathInputSchema, deps.logger, async ({ path }) => deps.fileService.exists(path))

  registerHandler('file:readBinary', pathInputSchema, deps.logger, async ({ path }) => {
    const info = await deps.fileService.info(path)
    if (!info) return { ok: false, error: 'FILE_NOT_FOUND' }
    if (info.size > deps.config.maxFileSizeMb * 1024 * 1024) {
      return { ok: false, error: 'FILE_TOO_LARGE' }
    }
    return deps.fileService.readBinary(path)
  })

  registerHandler('file:writeBinary', binaryPathSchema, deps.logger, async (input) => {
    let target = input.path ? assertSafePath(input.path) : null
    if (!target) {
      target = await deps.dialogs.saveExport(deps.getWindow(), {
        defaultName: input.defaultName,
        filters: DialogHelper.filtersFrom(input.filters, [{ name: 'All Files', extensions: ['*'] }])
      })
    }
    if (!target) return { ok: false, cancelled: true as const }
    const buffer = Buffer.from(input.dataBase64, 'base64')
    await atomicWriteFile(target, buffer)
    await deps.settings.set({ lastExportDir: dirname(target) })
    deps.dialogs.setLastExportDir(dirname(target))
    deps.logger.fileEvent('file:writeBinary', target, buffer.length)
    return { ok: true, cancelled: false as const, path: target, size: buffer.length }
  })

  registerHandler('file:watch', pathInputSchema, deps.logger, async ({ path }) => {
    const safe = assertSafePath(path)
    const previous = unwatchers.get(safe)
    previous?.()
    const unsubscribe = deps.watcher.watch(safe, (event: ExternalChangeEvent) => {
      const window = deps.getWindow()
      if (window && !window.isDestroyed()) {
        window.webContents.send('file:external-change', event)
      }
    })
    unwatchers.set(safe, unsubscribe)
    return { watching: true, path: safe }
  })

  registerHandler('file:unwatch', pathInputSchema, deps.logger, async ({ path }) => {
    const safe = assertSafePath(path)
    unwatchers.get(safe)?.()
    unwatchers.delete(safe)
    return { watching: false, path: safe }
  })
}
