import type {
  FontFamily,
  FontSize,
  MarginSize,
  PageSize,
  PaperTone,
  ThemeName
} from '../../electron/types/ipc'

export type ViewMode = 'editor' | 'split' | 'preview'
export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface DocumentSettings {
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
}

export interface ToastMessage {
  id: number
  kind: ToastKind
  message: string
  detail?: string
}

export interface DocumentStats {
  words: number
  characters: number
  charactersNoSpaces: number
  sentences: number
  paragraphs: number
  headings: number
  codeBlocks: number
  links: number
  images: number
  readingTimeMinutes: number
}

export interface HeadingItem {
  id: string
  text: string
  level: number
}

export interface CodeBlockItem {
  id: string
  language: string
  code: string
  index: number
}

export interface ExternalChange {
  path: string
  mtime: number
  kind: 'change' | 'unlink'
}

export interface ConflictState {
  diskMtime: number
}

export interface RecoveryState {
  filePath: string | null
  fileName: string
  fileContent: string
  savedContent: string
  diskMtime: number | null
  timestamp: number
}

export interface DocumentTheme {
  id: ThemeName
  name: string
  description: string
  accent: string
}

export const DOCUMENT_THEMES: DocumentTheme[] = [
  { id: 'modern', name: 'Modern', description: 'Clean and contemporary', accent: '#b45309' },
  { id: 'academic', name: 'Academic', description: 'Serif, structured, formal', accent: '#1d4ed8' },
  { id: 'minimal', name: 'Minimal', description: 'Quiet typography, generous space', accent: '#334155' },
  { id: 'editorial', name: 'Editorial', description: 'Magazine-style display type', accent: '#be123c' },
  { id: 'legal', name: 'Legal', description: 'Dense, numbered, authoritative', accent: '#7f1d1d' }
]

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  theme: 'modern',
  fontSize: 'md',
  fontFamily: 'sans',
  pageSize: 'A4',
  marginSize: 'normal',
  paperTone: 'white',
  showHeaderFooter: true,
  showPageNumbers: true,
  autoNumberHeadings: false,
  justifyText: false
}
