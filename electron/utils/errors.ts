export type ErrorCode =
  | 'IPC_INVALID'
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'FILE_UNSUPPORTED'
  | 'PATH_TRAVERSAL'
  | 'EXTERNAL_BLOCKED'
  | 'WRITE_FAILED'
  | 'CONFLICT'
  | 'UNKNOWN'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

export function serializeError(error: unknown): { code: ErrorCode; message: string } {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message }
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message }
  }
  return { code: 'UNKNOWN', message: String(error) }
}

export function toIpcError(error: unknown): Error {
  const serialized = serializeError(error)
  return new Error(`${serialized.code}: ${serialized.message}`)
}

export function normalizeIpcError(error: unknown): { code: ErrorCode; message: string } {
  const raw = error instanceof Error ? error.message : String(error)
  const cleaned = raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
  const match = /^([A-Z_]+): ([\s\S]*)$/.exec(cleaned)
  if (match && match[1] && match[2] !== undefined) {
    return { code: match[1] as ErrorCode, message: match[2] }
  }
  return { code: 'UNKNOWN', message: cleaned }
}
