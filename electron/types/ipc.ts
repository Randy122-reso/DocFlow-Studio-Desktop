export type TextEncoding = 'utf-8' | 'utf-8-bom' | 'utf-16le'
export type LineEnding = 'lf' | 'crlf' | 'cr'

export interface FilePayload {
  path: string
  name: string
  content: string
  size: number
  mtime: number
  encoding: TextEncoding
  lineEnding: LineEnding
}

export type OpenResult = { cancelled: true } | ({ cancelled: false } & FilePayload)

export interface SaveResult {
  ok: boolean
  path?: string
  size?: number
  mtime?: number
  conflict?: boolean
  diskMtime?: number
}

export interface BinarySaveResult {
  ok: boolean
  cancelled?: boolean
  path?: string
  size?: number
}

export interface RecentFile {
  path: string
  displayName: string
  lastOpenedAt: number
  size: number
  pinned: boolean
}

export interface SessionDraft {
  filePath: string | null
  fileName: string
  fileContent: string
  savedContent: string
  diskMtime: number | null
  encoding: TextEncoding
  lineEnding: LineEnding
  dirty: boolean
  timestamp: number
}

export type ThemeName = 'modern' | 'academic' | 'minimal' | 'editorial' | 'legal'
export type FontSize = 'sm' | 'md' | 'lg'
export type FontFamily = 'sans' | 'serif' | 'display' | 'mono'
export type PageSize = 'A4' | 'Letter'
export type MarginSize = 'compact' | 'normal' | 'spacious'
export type PaperTone = 'white' | 'cream' | 'dark'

export interface WindowBounds {
  width: number
  height: number
  x: number | null
  y: number | null
}

export interface AppSettings {
  schemaVersion: number
  theme: ThemeName
  fontSize: FontSize
  fontFamily: FontFamily
  pageSize: PageSize
  marginSize: MarginSize
  paperTone: PaperTone
  showHeaderFooter: boolean
  showPageNumbers: boolean
  autoNumberHeadings: boolean
  justifyText: boolean
  windowBounds: WindowBounds
  lastOpenedDir: string | null
  lastExportDir: string | null
}

export interface DirtyState {
  dirty: boolean
  filePath: string | null
  fileName: string
}

export interface MenuAction {
  action: string
  payload?: unknown
}

export interface OpenFileEvent {
  path: string
}

export interface ExternalChangeEvent {
  path: string
  mtime: number
  kind: 'change' | 'unlink'
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveBinaryInput {
  dataBase64: string
  defaultName: string
  filters?: FileFilter[]
}

export interface WriteBinaryInput extends SaveBinaryInput {
  path?: string
}

export interface WindowState {
  bounds: WindowBounds
  maximized: boolean
  fullScreen: boolean
}

export type UnsavedChoice = 'save' | 'discard' | 'cancel'
