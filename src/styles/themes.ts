import type { FontFamily, FontSize, MarginSize, PageSize, PaperTone, ThemeName } from '../../electron/types/ipc'

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: 'Compact',
  md: 'Normal',
  lg: 'Large'
}

export const FONT_FAMILY_LABELS: Record<FontFamily, string> = {
  sans: 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  mono: 'Monospace'
}

export const PAGE_SIZE_LABELS: Record<PageSize, string> = {
  A4: 'A4 (210 × 297 mm)',
  Letter: 'Letter (8.5 × 11 in)'
}

export const MARGIN_LABELS: Record<MarginSize, string> = {
  compact: 'Compact',
  normal: 'Normal',
  spacious: 'Spacious'
}

export const PAPER_TONE_LABELS: Record<PaperTone, string> = {
  white: 'White',
  cream: 'Cream',
  dark: 'Dark'
}

export const THEME_LABELS: Record<ThemeName, string> = {
  modern: 'Modern',
  academic: 'Academic',
  minimal: 'Minimal',
  editorial: 'Editorial',
  legal: 'Legal'
}

export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 }
}

export const MARGIN_VALUES_MM: Record<MarginSize, number> = {
  compact: 14,
  normal: 22,
  spacious: 30
}
