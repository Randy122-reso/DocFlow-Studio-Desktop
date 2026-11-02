import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import type { RecoveryState } from './types/document'
import type { FormatAction } from './utils/editorActions'
import { applyFormatting } from './utils/editorActions'
import { parseMarkdown, extractCodeBlocks } from './utils/markdownParser'
import { computeDocumentStats } from './utils/documentStats'
import { useFileStore } from './store/fileStore'
import { useFileSession } from './hooks/useFileSession'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useSettingsSync } from './hooks/useSettingsSync'
import { useWindowTitle } from './hooks/useWindowTitle'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { TopNav } from './components/TopNav'
import { FormattingToolbar } from './components/FormattingToolbar'
import { DocumentEditor } from './components/DocumentEditor'
import { DocumentViewer } from './components/DocumentViewer'
import { TableOfContents } from './components/TableOfContents'
import { StatusBar } from './components/StatusBar'
import { DocumentSettingsPanel } from './components/DocumentSettingsPanel'
import { ExportModal } from './components/ExportModal'
import { ZenReviewModal } from './components/ZenReviewModal'
import { CodeScriptModal } from './components/CodeScriptModal'
import { RecoveryPrompt } from './components/RecoveryPrompt'
import { ConflictDialog } from './components/ConflictDialog'
import { ShortcutHelpModal } from './components/ShortcutHelpModal'
import { Toast } from './components/Toast'

function toRecovery(draft: {
  filePath: string | null
  fileName: string
  fileContent: string
  savedContent: string
  diskMtime: number | null
  timestamp: number
}): RecoveryState {
  return {
    filePath: draft.filePath,
    fileName: draft.fileName,
    fileContent: draft.fileContent,
    savedContent: draft.savedContent,
    diskMtime: draft.diskMtime,
    timestamp: draft.timestamp
  }
}

export default function App() {
  const session = useFileSession()
  const sessionRef = useRef(session)
  sessionRef.current = session

  useRecentFiles()
  useSettingsSync()
  useWindowTitle()

  const content = useFileStore((state) => state.content)
  const fileName = useFileStore((state) => state.fileName)
  const filePath = useFileStore((state) => state.filePath)
  const settings = useFileStore((state) => state.settings)
  const viewMode = useFileStore((state) => state.viewMode)
  const setViewMode = useFileStore((state) => state.setViewMode)
  const setContent = useFileStore((state) => state.setContent)
  const recovery = useFileStore((state) => state.recovery)
  const conflict = useFileStore((state) => state.conflict)
  const externalChange = useFileStore((state) => state.externalChange)
  const dirty = useFileStore((state) => state.content !== state.savedContent)
  const encoding = useFileStore((state) => state.encoding)
  const lineEnding = useFileStore((state) => state.lineEnding)

  const [tocOpen, setTocOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [zenOpen, setZenOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1, selection: 0 })

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const deferredContent = useDeferredValue(content)
  const parsed = useMemo(() => parseMarkdown(deferredContent), [deferredContent])
  const stats = useMemo(() => computeDocumentStats(content), [content])
  const codeBlocks = useMemo(() => extractCodeBlocks(content), [content])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const launch = await window.docflow.app.consumeLaunchFile()
        if (launch && !cancelled) {
          const opened = await sessionRef.current.openPath(launch.path, true)
          if (opened) {
            useFileStore.getState().setBooted(true)
            return
          }
        }
        const draft = await window.docflow.session.load()
        if (!cancelled && draft && draft.dirty && draft.fileContent !== draft.savedContent) {
          useFileStore.getState().setRecovery(toRecovery(draft))
        }
      } catch {
        // The app remains usable with the welcome document.
      } finally {
        if (!cancelled) useFileStore.getState().setBooted(true)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const openExport = useCallback(() => {
    if (useFileStore.getState().viewMode === 'editor') {
      useFileStore.getState().setViewMode('split')
    }
    setExportOpen(true)
  }, [])

  const focusEditor = useCallback(() => {
    if (useFileStore.getState().viewMode === 'preview') {
      useFileStore.getState().setViewMode('split')
      requestAnimationFrame(() => editorRef.current?.focus())
      return
    }
    editorRef.current?.focus()
  }, [])

  const revealInFolder = useCallback(() => {
    const current = useFileStore.getState().filePath
    if (!current) {
      useFileStore.getState().showToast('info', 'Save the document first', 'There is no file on disk yet.')
      return
    }
    void window.docflow.app.showItemInFolder(current).catch(() => undefined)
  }, [])

  useEffect(() => {
    const unsubscribeOpen = window.docflow.app.onOpenFile(({ path }) => {
      void sessionRef.current.openPath(path)
    })

    const unsubscribeAction = window.docflow.app.onAction(({ action }) => {
      switch (action) {
        case 'new':
          void sessionRef.current.newDocument()
          break
        case 'open':
          void sessionRef.current.openDialog()
          break
        case 'save':
          void sessionRef.current.save()
          break
        case 'saveAs':
          void sessionRef.current.saveAs()
          break
        case 'request-save-and-close':
          void sessionRef.current.requestSaveAndClose()
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
          setTocOpen((value) => !value)
          break
        case 'find':
          focusEditor()
          break
        case 'reveal':
          revealInFolder()
          break
        case 'quit':
          void window.docflow.window.close()
          break
        case 'guide':
          useFileStore
            .getState()
            .showToast('info', 'User guide', 'Open docs/USER_GUIDE.md in the project folder for the full manual.')
          break
        default:
          break
      }
    })

    return () => {
      unsubscribeOpen()
      unsubscribeAction()
    }
  }, [focusEditor, openExport, revealInFolder])

  const handleFormat = useCallback(
    (action: FormatAction) => {
      const textarea = editorRef.current
      if (!textarea) return
      const result = applyFormatting(textarea, action)
      setContent(result.value)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
        const before = result.value.slice(0, result.selectionStart)
        const lines = before.split('\n')
        setCursor({
          line: lines.length,
          column: (lines[lines.length - 1]?.length ?? 0) + 1,
          selection: Math.abs(result.selectionEnd - result.selectionStart)
        })
      })
    },
    [setContent]
  )

  const focusHeading = useCallback((id: string) => {
    const target = previewRef.current?.querySelector<HTMLElement>(`[id="${id.replace(/"/g, '\\"')}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files.item(0)
    if (!file) return
    const path = window.docflow.file.getPathForFile(file)
    if (!path) {
      useFileStore.getState().showToast('error', 'This file cannot be opened', 'Drag a Markdown file from your file manager.')
      return
    }
    await sessionRef.current.openPath(path)
  }

  const handleRestore = async () => {
    const draft = useFileStore.getState().recovery
    if (!draft) return
    useFileStore.getState().loadRecovery(draft)
    if (draft.filePath) await window.docflow.file.watch(draft.filePath).catch(() => undefined)
    useFileStore.getState().showToast('success', 'Draft restored', 'Review the content and save when ready.')
  }

  const handleDiscardRecovery = async () => {
    useFileStore.getState().setRecovery(null)
    await window.docflow.session.clear().catch(() => undefined)
    useFileStore.getState().showToast('info', 'Draft discarded', 'The recovery copy was removed.')
  }

  const handleOpenOriginal = async () => {
    const draft = useFileStore.getState().recovery
    if (!draft?.filePath) return
    useFileStore.getState().setRecovery(null)
    await window.docflow.session.clear().catch(() => undefined)
    await sessionRef.current.openPath(draft.filePath, true)
  }

  useKeyboardShortcuts({
    onNew: () => void sessionRef.current.newDocument(),
    onOpen: () => void sessionRef.current.openDialog(),
    onSave: () => void sessionRef.current.save(),
    onSaveAs: () => void sessionRef.current.saveAs(),
    onExport: openExport,
    onFind: focusEditor
  })

  const title = fileName.replace(/\.[^.]+$/, '')

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
        onNew={() => void sessionRef.current.newDocument()}
        onOpen={() => void sessionRef.current.openDialog()}
        onSave={() => void sessionRef.current.save()}
        onSaveAs={() => void sessionRef.current.saveAs()}
        onExport={openExport}
        onZen={() => setZenOpen(true)}
        onCode={() => setCodeOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onToggleToc={() => setTocOpen((value) => !value)}
        onOpenRecent={(path) => void sessionRef.current.openPath(path)}
        onPinRecent={(path) => void sessionRef.current.togglePin(path)}
        onRemoveRecent={(path) => void sessionRef.current.removeRecent(path)}
        onClearRecent={() => void sessionRef.current.clearRecent()}
      />

      <FormattingToolbar
        viewMode={viewMode}
        disabled={viewMode === 'preview'}
        onViewMode={setViewMode}
        onFormat={handleFormat}
      />

      <div className="workspace">
        {tocOpen && (
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
                <strong>{fileName}</strong> was changed by another program.
              </span>
              <div className="external-actions">
                <button type="button" onClick={() => void session.reloadExternal()}>
                  <RefreshCw size={13} /> Reload from disk
                </button>
                <button type="button" onClick={session.dismissExternal}>
                  Keep editing
                </button>
                <button type="button" className="external-close" onClick={session.dismissExternal} title="Dismiss">
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
              />
            )}
          </div>
        </main>
      </div>

      <StatusBar
        filePath={filePath}
        dirty={dirty}
        encoding={encoding}
        lineEnding={lineEnding}
        cursor={cursor}
        stats={stats}
      />

      {dragging && (
        <div className="drop-overlay">
          <div className="drop-card">
            <span className="drop-icon">↓</span>
            <strong>Drop to open</strong>
            <span>Markdown, text, or any readable document</span>
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
        getPreviewElement={() => previewRef.current}
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

      {recovery && (
        <RecoveryPrompt
          recovery={recovery}
          onRestore={() => void handleRestore()}
          onDiscard={() => void handleDiscardRecovery()}
          onOpenOriginal={() => void handleOpenOriginal()}
        />
      )}

      {conflict && (
        <ConflictDialog
          diskMtime={conflict.diskMtime}
          fileName={fileName}
          onOverwrite={() => void session.overwriteConflict()}
          onReload={() => void session.reloadConflict()}
          onSaveAs={() => void session.saveAsConflict()}
          onCancel={() => useFileStore.getState().setConflict(null)}
        />
      )}

      <Toast />
    </div>
  )
}
