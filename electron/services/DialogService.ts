import {
  app,
  BrowserWindow,
  dialog,
  shell,
  type FileFilter as ElectronFileFilter,
  type MessageBoxOptions,
  type OpenDialogOptions,
  type SaveDialogOptions
} from 'electron'
import type { FileFilter, UnsavedChoice } from '../types/ipc'
import { AppError } from '../utils/errors'
import { assertSafePath } from '../utils/paths'

export interface DialogServiceOptions {
  e2eMode: boolean
  e2eSavePath?: string
}

const TEXT_FILTERS: FileFilter[] = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
  { name: 'All Files', extensions: ['*'] }
]

export class DialogService {
  private readonly options: DialogServiceOptions
  private lastOpenedDir: string | null = null
  private lastExportDir: string | null = null

  constructor(options: DialogServiceOptions) {
    this.options = options
  }

  setLastOpenedDir(dir: string | null): void {
    this.lastOpenedDir = dir
  }

  setLastExportDir(dir: string | null): void {
    this.lastExportDir = dir
  }

  async openFile(window: BrowserWindow | null): Promise<string | null> {
    if (this.options.e2eMode) {
      return this.options.e2eSavePath ?? null
    }
    const options: OpenDialogOptions = {
      title: 'Open Markdown document',
      defaultPath: this.lastOpenedDir ?? app.getPath('documents'),
      filters: TEXT_FILTERS,
      properties: ['openFile']
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return assertSafePath(result.filePaths[0])
  }

  async saveFile(
    window: BrowserWindow | null,
    options: { defaultName: string; filters: FileFilter[] }
  ): Promise<string | null> {
    if (this.options.e2eMode) {
      return this.options.e2eSavePath ?? null
    }
    const saveOptions: SaveDialogOptions = {
      title: 'Save document',
      defaultPath: this.lastOpenedDir
        ? `${this.lastOpenedDir}\\${options.defaultName}`
        : options.defaultName,
      filters: options.filters,
      properties: ['createDirectory', 'showOverwriteConfirmation']
    }
    const result = window
      ? await dialog.showSaveDialog(window, saveOptions)
      : await dialog.showSaveDialog(saveOptions)
    if (result.canceled || !result.filePath) return null
    return assertSafePath(result.filePath)
  }

  async saveExport(
    window: BrowserWindow | null,
    options: { defaultName: string; filters: FileFilter[] }
  ): Promise<string | null> {
    if (this.options.e2eMode) {
      return this.options.e2eSavePath ?? null
    }
    const saveOptions: SaveDialogOptions = {
      title: 'Export document',
      defaultPath: this.lastExportDir
        ? `${this.lastExportDir}\\${options.defaultName}`
        : options.defaultName,
      filters: options.filters,
      properties: ['createDirectory', 'showOverwriteConfirmation']
    }
    const result = window
      ? await dialog.showSaveDialog(window, saveOptions)
      : await dialog.showSaveDialog(saveOptions)
    if (result.canceled || !result.filePath) return null
    return assertSafePath(result.filePath)
  }

  async confirmUnsaved(window: BrowserWindow | null, fileName: string): Promise<UnsavedChoice> {
    const options: MessageBoxOptions = {
      type: 'warning',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: 'Unsaved changes',
      message: `Save changes to "${fileName}"?`,
      detail: 'Your changes will be lost if you close without saving.'
    }
    const result = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options)
    if (result.response === 0) return 'save'
    if (result.response === 1) return 'discard'
    return 'cancel'
  }

  async message(
    window: BrowserWindow | null,
    options: Pick<MessageBoxOptions, 'type' | 'title' | 'message' | 'detail' | 'buttons'> & {
      defaultId?: number
      cancelId?: number
    }
  ): Promise<number> {
    const messageOptions: MessageBoxOptions = {
      noLink: true,
      ...options
    }
    const result = window
      ? await dialog.showMessageBox(window, messageOptions)
      : await dialog.showMessageBox(messageOptions)
    return result.response
  }

  showItemInFolder(path: string): void {
    shell.showItemInFolder(assertSafePath(path))
  }

  openExternal(url: string, allowedHosts: string[]): void {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new AppError('EXTERNAL_BLOCKED', 'Invalid URL')
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new AppError('EXTERNAL_BLOCKED', 'Only http(s) links can be opened')
    }
    const host = parsed.hostname.toLowerCase()
    const allowed = allowedHosts.some((entry) => {
      const normalized = entry.trim().toLowerCase()
      if (!normalized) return false
      if (normalized.startsWith('*.')) {
        const base = normalized.slice(2)
        return host === base || host.endsWith(`.${base}`)
      }
      return host === normalized
    })
    if (!allowed) {
      throw new AppError('EXTERNAL_BLOCKED', `External host is not allow-listed: ${host}`)
    }
    void shell.openExternal(parsed.toString())
  }

  static filtersFrom(input: FileFilter[] | undefined, fallback: FileFilter[]): ElectronFileFilter[] {
    return (input && input.length > 0 ? input : fallback).map((filter) => ({
      name: filter.name,
      extensions: filter.extensions
    }))
  }
}
