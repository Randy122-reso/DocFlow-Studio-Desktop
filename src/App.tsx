import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import type { FormatAction } from './utils/editorActions'
import { applyFormatting } from './utils/editorActions'
import { parseMarkdown, extractCodeBlocks } from './utils/markdownParser'
import { computeDocumentStats } from './utils/documentStats'
import { useFileStore } from './store/fileStore'
import { useTabStore } from './store/tabStore'
import { useSearchStore } from './store/searchStore'
import { useUIStore } from './store/uiStore'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useSettingsSync } from './hooks/useSettingsSync'
import { useWindowTitle } from './hooks/useWindowTitle'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useScrollSync } from './hooks/useScrollSync'
import { useTabManager } from './hooks/useTabManager'
import { useTabPersistence } from './hooks/useTabPersistence'
import { useMultiWindow } from './hooks/useMultiWindow'
import { useUpdate } from './hooks/useUpdate'
import { useI18n } from './hooks/useI18n'
import { useFindReplace } from './hooks/useFindReplace'
import { TopNav } from './components/TopNav'
import { TabBar } from './components/TabBar'
import { UpdateBanner } from './components/UpdateBanner'
import { FormattingToolbar } from './components/FormattingToolbar'
import { FindReplaceBar } from './components/FindReplaceBar'
import { FindResultsPanel } from './components/FindResultsPanel'
import { FindInFilesPanel } from './components/FindInFilesPanel'
import { DocumentEditor } from './components/DocumentEditor'
import { DocumentViewer } from './components/DocumentViewer'
import { TableOfContents } from './components/TableOfContents'
import { StatusBar } from './components/StatusBar'
import { DocumentSettingsPanel } from './components/DocumentSettingsPanel'
import { ExportModal } from './components/ExportModal'
import { ZenReviewModal } from './components/ZenReviewModal'
import { CodeScriptModal } from './components/CodeScriptModal'
import { ConflictDialog } from './components/ConflictDialog'
import { ShortcutHelpModal } from './components/ShortcutHelpModal'
import { Toast } from './components/Toast'

function cursorFromOffset(content: string, offset: number): { line: number; column: number } {
  const before = content.slice(0, Math.max(0, Math.min(offset, content.length)))
  const lines = before.split('\n')
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}

export default function App() {
  const tabs = useTabStore((state) => state.tabs)
  const activeTabId = useTabStore((state) => state.activeTabId)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null
  const content = activeTab?.fileContent ?? ''
  const fileName = activeTab?.displayName ?? 'Welcome.md'
  const filePath = activeTab?.filePath ?? null
  const dirty = activeTab ? activeTab.fileContent !== activeTab.savedContent : false

  const settings = useFileStore((state) => state.settings)
  const setViewMode = useUIStore((state) => state.setUIState)
  const viewMode = useUIStore((state) => state.viewMode)
  const uiState = useUIStore()

  useTabPersistence()
  const manager = useTabManager()
  const multiWindow = useMultiWindow()
  const { t } = useI18n()
  useUpdate()
  useRecentFiles()
  useSettingsSync()
  useWindowTitle()

  const managerRef = useRef(manager)
  managerRef.current = manager
  const multiWindowRef = useRef(multiWindow)
  multiWindowRef.current = multiWindow

  const deferredContent = useDeferredValue(content)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [zenOpen, setZenOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [windowCount, setWindowCount] = useState(1)
  const [cursor, setCursor] = useState({ line: 1, column: 1, selection: 0 })

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { handleTocClick, handleEditorScroll } = useScrollSync(editorRef, previewRef)
  const { findNext, findPrevious } = useFindReplace(editorRef)

  const parsed = useMemo(() => parseMarkdown(deferredContent), [deferredContent])
  const stats = useMemo(() => computeDocumentStats(content), [content])
  const codeBlocks = useMemo(() => extractCodeBlocks(content), [content])

  const setContent = useCallback((value: string) => {
    const id = useTabStore.getState().activeTabId
    if (id) useTabStore.getState().setBuffer(id, value)
  }, [])

  const openFind = useCallback((showReplace = false) => {
    const search = useSearchStore.getState()
    const ui = useUIStore.getState()
    if (ui.viewMode === 'preview') ui.setUIState({ viewMode: 'split' })
    search.openFind(showReplace)
    const editor = editorRef.current
    if (editor && document.activeElement === editor && editor.selectionEnd > editor.selectionStart) {
      search.setSelectionRange({ start: editor.selectionStart, end: editor.selectionEnd })
    } else {
      search.setSelectionRange(null)
    }
  }, [])

  const openFindInFiles = useCallback(() => {
    const search = useSearchStore.getState()
    const ui = useUIStore.getState()
    if (ui.viewMode === 'preview') ui.setUIState({ viewMode: 'split' })
    search.openFindInFiles()
  }, [])

  const openExport = useCallback(() => {
    if (useUIStore.getState().viewMode === 'editor') {
      useUIStore.getState().setUIState({ viewMode: 'split' })
    }
    setExportOpen(true)
  }, [])

  const focusEditor = useCallback(() => {
    if (useUIStore.getState().viewMode === 'preview') {
      useUIStore.getState().setUIState({ viewMode: 'split' })
      requestAnimationFrame(() => editorRef.current?.focus())
      return
    }
    editorRef.current?.focus()
  }, [])

  const revealInFolder = useCallback(() => {
    const current = useTabStore.getState().getActive()
    if (!current?.filePath) {
      useFileStore.getState().showToast('info', t('common.saveFirst'), t('common.saveFirstDetail'))
      return
    }
    void window.docflow.app.showItemInFolder(current.filePath).catch(() => undefined)
  }, [t])

  const togglePin = useCallback(() => {
    const id = useTabStore.getState().activeTabId
    if (id) useTabStore.getState().togglePin(id)
  }, [])

  const cycleTab = useCallback((direction: 1 | -1) => {
    const state = useTabStore.getState()
    if (state.tabs.length < 2) return
    const index = state.tabs.findIndex((tab) => tab.id === state.activeTabId)
    const next = (index + direction + state.tabs.length) % state.tabs.length
    state.activateTab(state.tabs[next].id)
  }, [])

  // Keep the window count in sync across windows without a dedicated broadcast.
  useEffect(() => {
    let cancelled = false
    const sync = () => {
      void window.docflow?.window
        ?.count?.()
        .then((count) => {
          if (!cancelled) setWindowCount(count)
        })
        .catch(() => undefined)
    }
    sync()
    const timer = window.setInterval(sync, 4000)
    window.addEventListener('focus', sync)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', sync)
    }
  }, [])

  // Open a file passed by the OS after the session has been hydrated.
  useEffect(() => {
    let disposed = false
    let started = false
    const boot = async () => {
      if (started) return
      started = true
      for (let attempt = 0; attempt < 80 && !useTabStore.getState().hydrated; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      if (disposed) return
      try {
        const launch = await window.docflow.app.consumeLaunchFile()
        if (launch) await managerRef.current.openPath(launch.path, true)
      } catch {
        // The welcome document remains usable if launch routing fails.
      }
    }
    void boot()
    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    const unsubscribeOpen = window.docflow.app.onOpenFile(({ path }) => {
      void managerRef.current.openPath(path)
    })

    const unsubscribeAction = window.docflow.app.onAction(({ action }) => {
      const current = useTabStore.getState()
      const api = managerRef.current
      switch (action) {
        case 'new':
        case 'newTab':
          void api.newTab()
          break
        case 'open':
          void api.openDialog()
          break
        case 'save':
          void api.save()
          break
        case 'saveAs':
          void api.saveAs()
          break
        case 'saveAll':
          void api.saveAll()
          break
        case 'closeTab':
          if (current.activeTabId) void api.closeTab(current.activeTabId)
          break
        case 'closeOthers':
          if (current.activeTabId) void api.closeOthers(current.activeTabId)
          break
        case 'closeRight':
          if (current.activeTabId) void api.closeToRight(current.activeTabId)
          break
        case 'closeLeft':
          if (current.activeTabId) void api.closeToLeft(current.activeTabId)
          break
        case 'request-save-and-close':
          void api.requestSaveAndClose()
          break
        case 'discard-and-close':
          void api.discardAndClose()
          break
        case 'export':
          openExport()
          break
        case 'zen':
          setZenOpen(true)
          break
        case 'settings':
          setSettingsOpen(true)
          break
        case 'code':
          setCodeOpen(true)
          break
        case 'shortcuts':
          setShortcutsOpen(true)
          break
        case 'toggleToc':
          useUIStore.getState().setUIState({ isTocVisible: !useUIStore.getState().isTocVisible })
          break
        case 'find':
          openFind(false)
          break
        case 'replace':
          openFind(true)
          break
        case 'findInFiles':
          openFindInFiles()
          break
        case 'reveal':
          revealInFolder()
          break
        case 'newWindow':
          void multiWindowRef.current.newWindow()
          break
        case 'quit':
          void window.docflow.window.close()
          break
        case 'guide':
          useFileStore
            .getState()
            .showToast('info', t('common.userGuide'), 'Open docs/USER_GUIDE.md in the project folder for the full manual.')
          break
        default:
          break
      }
    })

    const unsubscribeTabAction = window.docflow.app.onTabAction(({ action, tabId }) => {
      const api = managerRef.current
      switch (action) {
        case 'close':
          void api.closeTab(tabId)
          break
        case 'closeOthers':
          void api.closeOthers(tabId)
          break
        case 'closeRight':
          void api.closeToRight(tabId)
          break
        case 'closeLeft':
          void api.closeToLeft(tabId)
          break
        case 'togglePin':
          api.togglePin(tabId)
          break
        case 'detach':
          void multiWindowRef.current.detachTab(tabId)
          break
        default:
          break
      }
    })

    return () => {
      unsubscribeOpen()
      unsubscribeAction()
      unsubscribeTabAction()
    }
  }, [openExport, openFind, openFindInFiles, revealInFolder, t])

  const handleFormat = useCallback(
    (action: FormatAction) => {
      const textarea = editorRef.current
      const id = useTabStore.getState().activeTabId
      if (!textarea || !id) return
      const result = applyFormatting(textarea, action)
      useTabStore.getState().setBuffer(id, result.value)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
        const position = cursorFromOffset(result.value, result.selectionStart)
        setCursor({
          line: position.line,
          column: position.column,
          selection: Math.abs(result.selectionEnd - result.selectionStart)
        })
      })
    },
    []
  )

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const onScroll = () => {
      handleEditorScroll()
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        scrollTimerRef.current = null
        const id = useTabStore.getState().activeTabId
        if (id) useTabStore.getState().updateTab(id, { editorScrollTop: el.scrollTop })
      }, 180)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current)
        scrollTimerRef.current = null
      }
    }
  }, [handleEditorScroll])

  useEffect(() => {
    const tab = useTabStore.getState().getTab(useTabStore.getState().activeTabId ?? '')
    if (!tab) return
    const frame = requestAnimationFrame(() => {
      const editor = editorRef.current
      if (editor) {
        editor.scrollTop = tab.editorScrollTop
        const start = Math.min(tab.cursorOffset, editor.value.length)
        const end = Math.min(Math.max(tab.selectionEnd, start), editor.value.length)
        editor.setSelectionRange(start, end)
      }
      const preview = previewRef.current
      if (preview) preview.scrollTop = tab.previewScrollTop
    })
    const position = cursorFromOffset(tab.fileContent, tab.cursorOffset)
    setCursor({
      line: position.line,
      column: position.column,
      selection: Math.max(0, tab.selectionEnd - tab.cursorOffset)
    })
    return () => cancelAnimationFrame(frame)
  }, [activeTabId])

  const focusHeading = useCallback(
    (id: string) => {
      const item = parsed.headings.find((heading) => heading.id === id)
      if (item) handleTocClick(item)
      else {
        const target = previewRef.current?.querySelector<HTMLElement>(`[id="${id.replace(/"/g, '\\"')}"]`)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [parsed.headings, handleTocClick]
  )

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files.item(0)
    if (!file) return
    const path = window.docflow.file.getPathForFile(file)
    if (!path) {
      useFileStore.getState().showToast('error', t('common.openFailed'), t('common.openFailedDetail'))
      return
    }
    await managerRef.current.openPath(path)
  }

  useKeyboardShortcuts({
    onNew: () => void managerRef.current.newTab(),
    onOpen: () => void managerRef.current.openDialog(),
    onSave: () => void managerRef.current.save(),
    onSaveAs: () => void managerRef.current.saveAs(),
    onExport: openExport,
    onFind: () => (useSearchStore.getState().isOpen ? findNext() : openFind(false)),
    onReplace: () => openFind(true),
    onFindInFiles: openFindInFiles,
    onCloseTab: () => {
      const id = useTabStore.getState().activeTabId
      if (id) void managerRef.current.closeTab(id)
    },
    onNextTab: () => cycleTab(1),
    onPreviousTab: () => cycleTab(-1),
    onTogglePin: togglePin,
    onNewWindow: () => void multiWindowRef.current.newWindow(),
    onFindNext: () => {
      if (useSearchStore.getState().query) findNext()
      else openFind(false)
    },
    onFindPrevious: () => findPrevious()
  })

  const title = fileName.replace(/\.[^.]+$/, '')
  const externalChange = activeTab?.externalChange ?? null
  const conflict = activeTab?.conflict ?? null

  return (
    <div
      className={`app-shell ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={(event) => void handleDrop(event)}
    >
      <TopNav
        onNew={() => void manager.newTab()}
        onOpen={() => void manager.openDialog()}
        onSave={() => void manager.save()}
        onSaveAs={() => void manager.saveAs()}
        onExport={openExport}
        onZen={() => setZenOpen(true)}
        onCode={() => setCodeOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onToggleToc={() => useUIStore.getState().setUIState({ isTocVisible: !useUIStore.getState().isTocVisible })}
        onOpenRecent={(path) => void manager.openPath(path)}
        onPinRecent={(path) => void manager.toggleRecentPin(path)}
        onRemoveRecent={(path) => void manager.removeRecent(path)}
        onClearRecent={() => void manager.clearRecent()}
        onNewWindow={() => void multiWindow.newWindow()}
        onFindInFiles={openFindInFiles}
      />

      <TabBar
        onNewTab={() => void manager.newTab()}
        onCloseTab={(id) => void manager.closeTab(id)}
        onDetachTab={(id) => void multiWindow.detachTab(id)}
      />

      <UpdateBanner />

      <FormattingToolbar
        viewMode={viewMode}
        disabled={viewMode === 'preview'}
        onViewMode={(mode) => setViewMode({ viewMode: mode })}
        onFormat={handleFormat}
      />

      <FindReplaceBar editorRef={editorRef} />
      <FindResultsPanel editorRef={editorRef} />
      <FindInFilesPanel editorRef={editorRef} />

      <div className="workspace">
        {uiState.isTocVisible && (
          <TableOfContents
            headings={parsed.headings}
            stats={stats}
            theme={settings.theme}
            onSelect={focusHeading}
          />
        )}

        <main className="document-workspace">
          {externalChange && (
            <div className="external-banner">
              <AlertTriangle size={15} />
              <span>
                <strong>{fileName}</strong> {t('common.externalChange', { name: '' }).trim()}
              </span>
              <div className="external-actions">
                <button type="button" onClick={() => void manager.reloadExternal(activeTabId ?? undefined)}>
                  <RefreshCw size={13} /> {t('common.reloadFromDisk')}
                </button>
                <button type="button" onClick={() => manager.dismissExternal(activeTabId ?? undefined)}>
                  {t('common.keepEditing')}
                </button>
                <button
                  type="button"
                  className="external-close"
                  onClick={() => manager.dismissExternal(activeTabId ?? undefined)}
                  title={t('common.dismiss')}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          <div className={`panes view-${viewMode}`}>
            {viewMode !== 'preview' && (
              <DocumentEditor
                ref={editorRef}
                value={content}
                onChange={setContent}
                onCursorChange={setCursor}
                fontSize={settings.fontSize}
                fontFamily={settings.fontFamily}
              />
            )}
            {viewMode !== 'editor' && (
              <DocumentViewer
                ref={previewRef}
                html={parsed.html}
                title={title}
                settings={settings}
                zoomLevel={uiState.zoomLevel}
                isPagedMode={uiState.isPagedMode}
                onScrollTop={(top) => {
                  const id = useTabStore.getState().activeTabId
                  if (id) useTabStore.getState().updateTab(id, { previewScrollTop: top })
                }}
              />
            )}
          </div>
        </main>
      </div>

      <StatusBar
        filePath={filePath}
        dirty={dirty}
        encoding={activeTab?.encoding ?? 'utf-8'}
        lineEnding={activeTab?.lineEnding ?? 'lf'}
        cursor={cursor}
        stats={stats}
        tabCount={tabs.length}
        windowCount={windowCount}
        zoomLevel={uiState.zoomLevel}
      />

      {dragging && (
        <div className="drop-overlay">
          <div className="drop-card">
            <span className="drop-icon">↓</span>
            <strong>{t('common.dropToOpen')}</strong>
            <span>{t('common.dropHint')}</span>
          </div>
        </div>
      )}

      <DocumentSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        markdown={content}
        title={fileName}
        settings={settings}
        getPreviewElement={() => previewRef.current?.querySelector('.document-page') ?? null}
      />
      <ZenReviewModal
        open={zenOpen}
        onClose={() => setZenOpen(false)}
        html={parsed.html}
        title={fileName}
        settings={settings}
        onThemeChange={(theme) => useFileStore.getState().setSettings({ theme })}
      />
      <CodeScriptModal open={codeOpen} onClose={() => setCodeOpen(false)} blocks={codeBlocks} />
      <ShortcutHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {conflict && activeTabId && (
        <ConflictDialog
          diskMtime={conflict.diskMtime}
          fileName={fileName}
          onOverwrite={() => void manager.overwriteConflict(activeTabId)}
          onReload={() => void manager.reloadConflict(activeTabId)}
          onSaveAs={() => void manager.saveAsConflict(activeTabId)}
          onCancel={() => useTabStore.getState().setConflict(activeTabId, null)}
        />
      )}

      <Toast />
    </div>
  )
}
