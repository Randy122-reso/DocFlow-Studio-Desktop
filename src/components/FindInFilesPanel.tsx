import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { FolderOpen, Loader2, RefreshCw, Search, Square, X } from 'lucide-react'
import type { FindResult } from '../../electron/types/ipc'
import { useSearchStore } from '../store/searchStore'
import { useUIStore } from '../store/uiStore'
import { useI18n } from '../hooks/useI18n'
import { useFindInFiles } from '../hooks/useFindInFiles'

interface FindInFilesPanelProps {
  editorRef: RefObject<HTMLTextAreaElement | null>
}

export function FindInFilesPanel({ editorRef }: FindInFilesPanelProps) {
  const search = useSearchStore()
  const { t } = useI18n()
  const { pickRoot, search: runSearch, cancel, previewReplace, applyReplace, openResult, clear } = useFindInFiles(editorRef)
  const queryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!search.inFilesOpen) return
    const timer = window.setTimeout(() => queryRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [search.inFilesOpen])

  if (!search.inFilesOpen) return null

  const groups = new Map<string, FindResult[]>()
  for (const result of search.inFilesResults) {
    const list = groups.get(result.filePath) ?? []
    list.push(result)
    groups.set(result.filePath, list)
  }

  const open = (result: FindResult) => {
    const ui = useUIStore.getState()
    if (ui.viewMode === 'preview') ui.setUIState({ viewMode: 'split' })
    void openResult(result)
  }

  return (
    <section className="find-files" aria-label={t('find.findInFiles')}>
      <header className="find-results-head">
        <strong>{t('find.findInFiles')}</strong>
        <button type="button" className="find-icon" onClick={clear} title={t('find.clearResults')}>
          <RefreshCw size={14} />
        </button>
        <button type="button" className="find-icon" onClick={() => search.closeFindInFiles()} title={t('find.close')}>
          <X size={14} />
        </button>
      </header>

      <div className="find-files-controls">
        <div className="find-folder">
          <input type="text" readOnly value={search.inFilesRoot} placeholder={t('find.chooseFolder')} aria-label={t('find.chooseFolder')} />
          <button type="button" className="find-action" onClick={() => void pickRoot()}>
            <FolderOpen size={14} /> {t('find.chooseFolder')}
          </button>
        </div>
        <input
          type="text"
          className="find-input"
          value={search.inFilesGlob}
          onChange={(event) => search.setInFilesGlob(event.target.value)}
          placeholder="**/*.{md,markdown,txt}"
          aria-label={t('find.glob')}
        />
        <div className="find-query-row">
          <Search size={15} />
          <input
            ref={queryRef}
            type="text"
            className="find-input"
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void runSearch()
              }
            }}
            placeholder={t('find.findPlaceholder')}
            aria-label={t('find.find')}
          />
          {search.inFilesBusy ? (
            <button type="button" className="find-action" onClick={() => void cancel()}>
              <Square size={13} /> {t('find.stop')}
            </button>
          ) : (
            <button type="button" className="find-action" onClick={() => void runSearch()}>
              {t('find.search')}
            </button>
          )}
        </div>
        <div className="find-query-row">
          <input
            type="text"
            className="find-input"
            value={search.replaceWith}
            onChange={(event) => search.setReplaceWith(event.target.value)}
            placeholder={t('find.replacePlaceholder')}
            aria-label={t('find.replace')}
          />
          <button type="button" className="find-action" disabled={search.replaceBusy} onClick={() => void previewReplace()}>
            {t('find.dryRun')}
          </button>
          <button
            type="button"
            className="find-action accent"
            disabled={search.replaceBusy || !search.replacePreview || search.replacePreview.length === 0}
            onClick={() => void applyReplace()}
          >
            {t('find.applyChanges')}
          </button>
        </div>
        <div className="find-files-meta">
          {search.inFilesBusy && <span><Loader2 size={13} className="spin" /> {t('find.searching')}</span>}
          <span>{t('find.filesScanned', { count: search.inFilesScanned })}</span>
          {search.inFilesTruncated && <span className="find-warning">{t('find.truncated')}</span>}
          {search.inFilesError && <span className="find-warning">{search.inFilesError}</span>}
          {search.replacePreview && (
            <span>{t('find.changes', { count: search.replacePreview.length })}</span>
          )}
        </div>
      </div>

      {search.replacePreview && search.replacePreview.length > 0 && (
        <div className="find-diffs">
          {search.replacePreview.slice(0, 10).map((change) => (
            <details key={change.path} open>
              <summary>
                <span title={change.path}>{change.path}</span>
                <span>{change.count}</span>
              </summary>
              <pre>{change.diff}</pre>
            </details>
          ))}
        </div>
      )}

      <div className="find-results-body">
        {groups.size === 0 ? (
          <p className="find-empty">{search.inFilesBusy ? t('find.searching') : t('find.noResults')}</p>
        ) : (
          [...groups.entries()].map(([filePath, results]) => (
            <div key={filePath} className="find-result-group">
              <div className="find-result-file" title={filePath}>
                {filePath.split(/[\\/]/).pop() ?? filePath}
                <span>{results.length}</span>
              </div>
              <ul>
                {results.map((result, index) => (
                  <li key={`${filePath}-${result.lineNumber}-${result.columnStart}-${index}`}>
                    <button type="button" onClick={() => open(result)}>
                      <span className="find-line">{result.lineNumber}</span>
                      <span className="find-preview">{result.preview.trim() || '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
