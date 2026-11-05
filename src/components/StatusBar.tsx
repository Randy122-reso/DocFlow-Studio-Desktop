import { FileText, HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { DocumentStats } from '../types/document'
import type { LineEnding, TextEncoding } from '../../electron/types/ipc'
import { useI18n } from '../hooks/useI18n'

interface StatusBarProps {
  filePath: string | null
  dirty: boolean
  encoding: TextEncoding
  lineEnding: LineEnding
  cursor: { line: number; column: number; selection: number }
  stats: DocumentStats
  saving?: boolean
  tabCount?: number
  windowCount?: number
  zoomLevel?: number
}

const ENCODING_LABEL: Record<TextEncoding, string> = {
  'utf-8': 'UTF-8',
  'utf-8-bom': 'UTF-8 BOM',
  'utf-16le': 'UTF-16 LE'
}

const LINE_ENDING_LABEL: Record<LineEnding, string> = {
  lf: 'LF',
  crlf: 'CRLF',
  cr: 'CR'
}

export function StatusBar({
  filePath,
  dirty,
  encoding,
  lineEnding,
  cursor,
  stats,
  saving,
  tabCount = 0,
  windowCount = 1,
  zoomLevel = 100
}: StatusBarProps) {
  const { t, locale } = useI18n()

  return (
    <footer className="statusbar">
      <div className="status-left">
        {filePath ? <HardDrive size={13} /> : <FileText size={13} />}
        <span className="status-path" title={filePath ?? t('common.notSaved')}>
          {filePath ?? t('common.notSaved')}
        </span>
      </div>
      <div className="status-right">
        <span className={`status-dirty ${dirty ? 'is-dirty' : 'is-saved'}`}>
          {dirty ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
          {saving ? t('common.exporting') : dirty ? t('common.unsaved') : t('common.saved')}
        </span>
        <span className="status-divider" />
        <span>{t('common.line')} {cursor.line}, {t('common.column')} {cursor.column}</span>
        {cursor.selection > 0 && <span>{cursor.selection} {t('common.selected')}</span>}
        <span className="status-divider" />
        <span>{stats.words.toLocaleString()} {t('common.words')}</span>
        <span>{stats.characters.toLocaleString()} {t('common.chars')}</span>
        <span className="status-divider" />
        <span>{tabCount} {t('tabs.tabs')}</span>
        <span>{windowCount} {locale === 'id' ? 'jendela' : 'windows'}</span>
        <span>{zoomLevel}%</span>
        <span className="status-divider" />
        <span>{ENCODING_LABEL[encoding]}</span>
        <span>{LINE_ENDING_LABEL[lineEnding]}</span>
        <span>{locale.toUpperCase()}</span>
      </div>
    </footer>
  )
}
