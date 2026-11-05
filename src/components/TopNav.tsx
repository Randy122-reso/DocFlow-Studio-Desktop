import {
  AppWindow,
  Braces,
  Download,
  FilePlus2,
  FileSearch,
  FileText,
  Focus,
  FolderOpen,
  PanelLeft,
  Save,
  SaveAll,
  Settings2
} from 'lucide-react'
import { useTabStore } from '../store/tabStore'
import { useFileStore } from '../store/fileStore'
import { useI18n } from '../hooks/useI18n'
import { RecentFilesMenu } from './RecentFilesMenu'
import { LanguageSwitcher } from './LanguageSwitcher'

interface TopNavProps {
  onNew(): void
  onOpen(): void
  onSave(): void
  onSaveAs(): void
  onExport(): void
  onZen(): void
  onCode(): void
  onSettings(): void
  onToggleToc(): void
  onOpenRecent(path: string): void
  onPinRecent(path: string): void
  onRemoveRecent(path: string): void
  onClearRecent(): void
  onNewWindow(): void
  onFindInFiles(): void
}

export function TopNav(props: TopNavProps) {
  const tabs = useTabStore((state) => state.tabs)
  const activeTabId = useTabStore((state) => state.activeTabId)
  const recents = useFileStore((state) => state.recents)
  const { t } = useI18n()
  const active = tabs.find((tab) => tab.id === activeTabId) ?? null
  const dirty = active ? active.fileContent !== active.savedContent : false

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 28 28" role="img" aria-label="DocFlow Studio">
            <rect x="6" y="4" width="16" height="20" rx="2" fill="#fdf6e3" />
            <path d="M18 4h4v4h-4z" fill="#e7d0a0" />
            <rect x="9" y="12" width="10" height="1.6" rx=".8" fill="#d97706" />
            <rect x="9" y="16" width="10" height="1.6" rx=".8" fill="#d97706" />
            <rect x="9" y="20" width="6" height="1.6" rx=".8" fill="#d97706" />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-name">DocFlow</span>
          <span className="brand-suffix">Studio</span>
        </div>
      </div>

      <div className="document-identity" title={active?.filePath ?? t('notSaved')}>
        <FileText size={14} />
        <span className="document-name">{active?.displayName ?? t('tabs:untitled')}</span>
        {dirty ? <span className="dirty-dot" title={t('tabs:dirty')} /> : <span className="saved-dot" title={t('saved')} />}
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-button" title={`${t('newTab')} (Ctrl+N)`} onClick={props.onNew}>
          <FilePlus2 size={17} />
        </button>
        <button type="button" className="icon-button" title={`${t('newWindow')} (Ctrl+Shift+N)`} onClick={props.onNewWindow}>
          <AppWindow size={17} />
        </button>
        <button type="button" className="icon-button" title={`${t('open')} (Ctrl+O)`} onClick={props.onOpen}>
          <FolderOpen size={17} />
        </button>
        <button type="button" className="icon-button save-button" title={`${t('save')} (Ctrl+S)`} onClick={props.onSave}>
          <Save size={17} />
        </button>
        <button type="button" className="icon-button" title={`${t('saveAs')} (Ctrl+Shift+S)`} onClick={props.onSaveAs}>
          <SaveAll size={17} />
        </button>
        <RecentFilesMenu
          recents={recents}
          onOpen={props.onOpenRecent}
          onPin={props.onPinRecent}
          onRemove={props.onRemoveRecent}
          onClear={props.onClearRecent}
        />
        <button type="button" className="icon-button" title={`${t('find:findInFiles')} (Ctrl+Shift+F)`} onClick={props.onFindInFiles}>
          <FileSearch size={17} />
        </button>
        <span className="topbar-divider" />
        <button type="button" className="text-button accent" title={`${t('export')} (Ctrl+E)`} onClick={props.onExport}>
          <Download size={15} />
          <span>{t('export')}</span>
        </button>
        <button type="button" className="icon-button" title={t('toc')} onClick={props.onToggleToc}>
          <PanelLeft size={17} />
        </button>
        <button type="button" className="icon-button" title={`${t('zen')} (F11)`} onClick={props.onZen}>
          <Focus size={17} />
        </button>
        <button type="button" className="icon-button" title={t('code')} onClick={props.onCode}>
          <Braces size={17} />
        </button>
        <button type="button" className="icon-button" title={t('documentSettings')} onClick={props.onSettings}>
          <Settings2 size={17} />
        </button>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
