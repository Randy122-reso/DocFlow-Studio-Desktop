import { normalizeIpcError } from '../../electron/utils/errors'
import type { ToastKind } from '../types/document'

const MESSAGES: Record<string, string> = {
  IPC_INVALID: 'The request was invalid. Please try again.',
  FILE_NOT_FOUND: 'The file could not be found. It may have been moved or deleted.',
  FILE_TOO_LARGE: 'The file is larger than the allowed limit.',
  FILE_UNSUPPORTED: 'This file type or path is not supported.',
  PATH_TRAVERSAL: 'The selected path is not allowed.',
  EXTERNAL_BLOCKED: 'This external link is blocked by the security policy.',
  WRITE_FAILED: 'The file could not be written.',
  CONFLICT: 'The file was changed by another program.',
  UNKNOWN: 'Something went wrong.'
}

export function describeError(error: unknown): { kind: ToastKind; message: string; detail: string } {
  const normalized = normalizeIpcError(error)
  const message = MESSAGES[normalized.code] ?? normalized.message
  return {
    kind: normalized.code === 'CONFLICT' ? 'warning' : 'error',
    message,
    detail: normalized.message !== message ? normalized.message : ''
  }
}
