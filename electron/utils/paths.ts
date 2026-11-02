import { app } from 'electron'
import { isAbsolute, join, normalize, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { AppError } from './errors'

export interface DataPaths {
  userData: string
  session: string
  settings: string
  recent: string
  logs: string
  cache: string
}

export function getDataPaths(): DataPaths {
  const userData = app.getPath('userData')
  return {
    userData,
    session: join(userData, 'session.json'),
    settings: join(userData, 'settings.json'),
    recent: join(userData, 'recent.json'),
    logs: join(userData, 'logs'),
    cache: join(userData, 'cache')
  }
}

export function isAbsolutePath(value: string): boolean {
  return isAbsolute(value)
}

/**
 * Reject relative traversal and null bytes. Absolute paths are allowed because
 * desktop users legitimately open documents outside their home directory via
 * a native file picker or drag-and-drop.
 */
export function assertSafePath(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new AppError('IPC_INVALID', 'Path must be a non-empty string')
  }
  if (value.includes('\0')) {
    throw new AppError('PATH_TRAVERSAL', 'Path contains a null byte')
  }
  const segments = value.split(/[\\/]+/)
  if (segments.includes('..')) {
    throw new AppError('PATH_TRAVERSAL', 'Relative path traversal is not allowed')
  }
  if (!isAbsolute(value)) {
    throw new AppError('PATH_TRAVERSAL', 'Path must be absolute')
  }
  return normalize(resolve(value))
}

export function isProbablyPath(value: string): boolean {
  if (!value || value.startsWith('-')) return false
  if (!/\.(md|markdown|txt)$/i.test(value)) return false
  return isAbsolute(value) || value.includes(sep) || value.includes('/')
}

export function isWithin(home: string, target: string): boolean {
  const normalizedHome = resolve(home).toLowerCase()
  const normalizedTarget = resolve(target).toLowerCase()
  return normalizedTarget === normalizedHome || normalizedTarget.startsWith(`${normalizedHome}${sep}`)
}

export function homeDirectory(): string {
  return homedir()
}
