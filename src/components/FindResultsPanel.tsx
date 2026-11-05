import type { RefObject } from 'react'
import { X } from 'lucide-react'
import type { FindResult } from '../../electron/types/ipc'
import { useSearchStore } from '../store/searchStore'
import { useUIStore } from '../store/uiStore'
import { useI18n } from '../hooks/useI18n'
import { useFindReplace } from '../hooks/useFindReplace'

interface FindResultsPanelProps {
  editorRef: RefObject<HTMLTextAreaElement | null>
}

export function FindResultsPanel({ editorRef }: FindResultsPanelProps) {
  const search = useSearchStore()
  const { t } = useI18n()
  const { goToResult } = useFindReplace(editorRef)

  if (!search.allResultsOpen) return null

  const groups = new Map<string, FindResult[]>()
  for (const result of search.allResults) {
    const key = result.tabId ?? result.filePath
    const list = groups.get(key) ?? []
    list.push(result)
    groups.set(key, list)
  }

  const open = (result: FindResult) => {
    const ui = useUIStore.getState()
    if (ui.viewMode === 'preview') ui.setUIState({ viewMode: 'split' })
    goToResult(result)
  }

  return (
    <section className="find-results" aria-label={t('find:results')}>
      <header className="find-results-head">
        <strong>{t('find:results')}</strong>
        <span>{t('find:matches', { count: search.allResults.length })}</span>
        {search.allResultsTruncated && <span className="find-warning">{t('find:truncated')}</span>}
        <button type="button" className="find-icon" onClick={() => search.clearAllResults()} title={t('find:close')}>
          <X size={14} />
        </button>
      </header>
      <div className="find-results-body">
        {groups.size === 0 ? (
          <p className="find-empty">{t('find:noResults')}</p>
        ) : (
          [...groups.entries()].map(([key, results]) => (
            <div key={key} className="find-result-group">
              <div className="find-result-file" title={results[0]?.filePath}>
                {results[0]?.filePath.split(/[\\/]/).pop() ?? key}
                <span>{results.length}</span>
              </div>
              <ul>
                {results.map((result, index) => (
                  <li key={`${key}-${result.lineNumber}-${result.columnStart}-${index}`}>
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
