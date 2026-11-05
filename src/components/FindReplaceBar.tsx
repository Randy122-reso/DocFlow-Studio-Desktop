import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { ArrowDown, ArrowUp, CaseSensitive, FileSearch, Replace, WholeWord, X } from 'lucide-react'
import type { FindMode } from '../../electron/types/ipc'
import { useSearchStore } from '../store/searchStore'
import { useI18n } from '../hooks/useI18n'
import { useFindReplace } from '../hooks/useFindReplace'

interface FindReplaceBarProps {
  editorRef: RefObject<HTMLTextAreaElement | null>
}

export function FindReplaceBar({ editorRef }: FindReplaceBarProps) {
  const search = useSearchStore()
  const { t } = useI18n()
  const { findNext, findPrevious, replaceOne, replaceAll, countMatches, findAllInTabs } = useFindReplace(editorRef)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!search.isOpen) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [search.isOpen])

  if (!search.isOpen) return null

  const matches = search.query ? countMatches() : 0
  const toggle = (key: 'matchCase' | 'matchWholeWord' | 'dotMatchesNewline' | 'wrapAround' | 'inSelection' | 'backward') => {
    search.setOptions({ [key]: !search.options[key] })
  }

  return (
    <div className="find-bar" role="search">
      <div className="find-row">
        <div className="find-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="find-input"
            list="docflow-find-history"
            placeholder={t('find.findPlaceholder')}
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (event.shiftKey) findPrevious()
                else findNext()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                search.closeFind()
              }
            }}
            aria-label={t('find.find')}
          />
          <datalist id="docflow-find-history">
            {search.history.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
        <span className={`find-count ${search.query && matches === 0 ? 'is-empty' : ''}`}>
          {search.query ? t('find.matches', { count: matches }) : ''}
        </span>
        <button type="button" className="find-icon" title={t('find.findPrevious')} onClick={() => findPrevious()}>
          <ArrowUp size={15} />
        </button>
        <button type="button" className="find-icon" title={t('find.findNext')} onClick={() => findNext()}>
          <ArrowDown size={15} />
        </button>
        <button
          type="button"
          className={`find-toggle ${search.options.matchCase ? 'active' : ''}`}
          title={t('find.matchCase')}
          aria-pressed={search.options.matchCase}
          onClick={() => toggle('matchCase')}
        >
          <CaseSensitive size={16} />
        </button>
        <button
          type="button"
          className={`find-toggle ${search.options.matchWholeWord ? 'active' : ''}`}
          title={t('find.wholeWord')}
          aria-pressed={search.options.matchWholeWord}
          onClick={() => toggle('matchWholeWord')}
        >
          <WholeWord size={16} />
        </button>
        <select
          className="find-mode"
          aria-label={t('find.modeNormal')}
          value={search.options.mode}
          onChange={(event) => search.setMode(event.target.value as FindMode)}
        >
          <option value="normal">{t('find.modeNormal')}</option>
          <option value="extended">{t('find.modeExtended')}</option>
          <option value="regex">{t('find.modeRegex')}</option>
        </select>
        <button
          type="button"
          className={`find-toggle ${search.options.inSelection ? 'active' : ''}`}
          title={t('find.inSelection')}
          aria-pressed={search.options.inSelection}
          onClick={() => toggle('inSelection')}
        >
          {t('find.inSelection')}
        </button>
        <button
          type="button"
          className={`find-toggle ${search.options.wrapAround ? 'active' : ''}`}
          title={t('find.wrapAround')}
          aria-pressed={search.options.wrapAround}
          onClick={() => toggle('wrapAround')}
        >
          {t('find.wrapAround')}
        </button>
        <button
          type="button"
          className="find-action"
          title={t('find.findInTabs')}
          onClick={() => findAllInTabs()}
        >
          {t('find.findInTabs')}
        </button>
        <button
          type="button"
          className="find-icon"
          title={t('find.findInFiles')}
          onClick={() => search.openFindInFiles()}
        >
          <FileSearch size={15} />
        </button>
        <button type="button" className="find-icon" title={t('find.close')} onClick={() => search.closeFind()}>
          <X size={15} />
        </button>
      </div>

      <div className="find-row find-options">
        <button
          type="button"
          className={`find-toggle ${search.showReplace ? 'active' : ''}`}
          onClick={() => useSearchStore.setState({ showReplace: !search.showReplace })}
        >
          <Replace size={14} /> {t('find.replace')}
        </button>
        {search.showReplace && (
          <>
            <input
              type="text"
              className="find-input replace-input"
              placeholder={t('find.replacePlaceholder')}
              value={search.replaceWith}
              onChange={(event) => search.setReplaceWith(event.target.value)}
              aria-label={t('find.replace')}
            />
            <button type="button" className="find-action" onClick={() => replaceOne()} disabled={!search.query}>
              {t('find.replaceOne')}
            </button>
            <button type="button" className="find-action" onClick={() => replaceAll()} disabled={!search.query}>
              {t('find.replaceAll')}
            </button>
          </>
        )}
        {search.options.mode === 'extended' && (
          <label className="find-check">
            <input
              type="checkbox"
              checked={search.options.extendedUnicode}
              onChange={(event) => search.setOptions({ extendedUnicode: event.target.checked })}
            />
            {t('find.unicodeEscapes')}
          </label>
        )}
        <label className="find-check">
          <input
            type="checkbox"
            checked={search.options.dotMatchesNewline}
            onChange={(event) => search.setOptions({ dotMatchesNewline: event.target.checked })}
          />
          {t('find.dotNewline')}
        </label>
        <label className="find-check">
          <input
            type="checkbox"
            checked={search.options.backward}
            onChange={(event) => search.setOptions({ backward: event.target.checked })}
          />
          {t('find.backward')}
        </label>
        <button type="button" className="find-link" onClick={() => search.clearAllResults()}>
          {t('find.clearResults')}
        </button>
      </div>
    </div>
  )
}
