export type TextEncoding = 'utf-8' | 'utf-8-bom' | 'utf-16le'
export type LineEnding = 'lf' | 'crlf' | 'cr'

export type Locale = 'auto' | 'en' | 'id'
export type ResolvedLocale = 'en' | 'id'
export type UpdateChannel = 'stable' | 'beta'
export type FindMode = 'normal' | 'extended' | 'regex'

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

/** Legacy single-document recovery draft (schema v1–v4). */
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

export interface UIState {
  zoomLevel: number // 50 - 200
  isPagedMode: boolean
  autoScroll: boolean
  syncScrollWithToc: boolean
  viewMode?: 'editor' | 'split' | 'preview'
  isTocVisible?: boolean
  tocWidth?: number
  toolbarScrollLeft?: number
}

export interface WindowBounds {
  width: number
  height: number
  x: number | null
  y: number | null
}

export interface TrayConfig {
  enabled: boolean
  minimizeOnClose: boolean
  startMinimized: boolean
}

export interface AppSettings {
  schemaVersion: 4
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
  locale: Locale
  updateChannel: UpdateChannel
  autoCheckUpdates: boolean
  tray: TrayConfig
  uiState: UIState
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

/* ── Search & Replace ─────────────────────────────────────────── */

export interface FindOptions {
  matchCase: boolean
  matchWholeWord: boolean
  mode: FindMode
  dotMatchesNewline: boolean
  wrapAround: boolean
  inSelection: boolean
  backward: boolean
  extendedUnicode: boolean
}

export interface FindResult {
  tabId?: string
  filePath: string
  lineNumber: number
  columnStart: number
  columnEnd: number
  preview: string
}

export interface FindInFilesInput {
  rootDir: string
  glob: string
  query: string
  replaceWith?: string
  options: FindOptions
  maxResults?: number
  dryRun?: boolean
}

export interface FindFileChange {
  path: string
  count: number
  diff: string
}

export interface FindInFilesResponse {
  results: FindResult[]
  truncated: boolean
  filesScanned: number
  cancelled: boolean
}

export interface ReplaceInFilesResponse {
  changes: FindFileChange[]
  written: boolean
  cancelled: boolean
}

/* ── Tabs & multi-window ──────────────────────────────────────── */

export interface TabSnapshot {
  id: string
  filePath: string | null
  displayName: string
  fileContent: string
  savedContent: string
  diskMtime: number | null
  encoding: TextEncoding
  lineEnding: LineEnding
  isPinned: boolean
  editorScrollTop: number
  previewScrollTop: number
  cursorOffset: number
  selectionEnd: number
}

export interface SessionWindow {
  id: string
  bounds: WindowBounds
  tabs: TabSnapshot[]
  activeTabId: string | null
}

export interface FindOptionsSnapshot extends Omit<FindOptions, never> {}

export interface SessionState {
  schemaVersion: 5
  windows: SessionWindow[]
  activeWindowId: string | null
  findHistory: string[]
  findOptions: FindOptionsSnapshot
}

export interface WindowInfo {
  id: string
  bounds: WindowBounds
  maximized: boolean
  fullScreen: boolean
  initialTabs: TabSnapshot[]
  activeTabId: string | null
}

/* ── Update ───────────────────────────────────────────────────── */

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export interface UpdateState {
  status: UpdateStatus
  availableVersion: string | null
  downloadProgress: number
  releaseNotes: string | null
  lastCheckedAt: number | null
  channel: UpdateChannel
  error: string | null
  skippedVersion: string | null
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  version: string | null
  state: UpdateState
}

/* ── Context menu ─────────────────────────────────────────────── */

export type ContextMenuType = 'editor' | 'preview' | 'tab'

export interface ContextMenuRequest {
  type: ContextMenuType
  tabId?: string
  hasSelection?: boolean
  isEditable?: boolean
  isPinned?: boolean
  filePath?: string | null
}
