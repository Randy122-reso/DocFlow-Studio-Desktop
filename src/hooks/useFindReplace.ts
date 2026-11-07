import { EDITOR_LINE_HEIGHT_FALLBACK } from '../constants/editor'
import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { FindOptions, FindResult } from '../../electron/types/ipc'
import { useTabStore } from '../store/tabStore'
import { useSearchStore, FIND_RESULTS_MAX } from '../store/searchStore'
import { useFileStore } from '../store/fileStore'
import { useI18n } from './useI18n'
import {
  buildRegExp,
  decodeExtendedEscapes,
  findAll,
  lineColumnAt,
  lineTextAt
} from '../utils/searchRegex'
import { describeError } from '../utils/errors'

interface MatchRange {
  index: number
  length: number
}

function selectionBounds(content: string, options: FindOptions): { start: number; end: number } {
  if (!options.inSelection) return { start: 0, end: content.length }
  const range = useSearchStore.getState().selectionRange
  if (!range || range.end <= range.start) return { start: 0, end: content.length }
  return { start: Math.max(0, range.start), end: Math.min(content.length, range.end) }
}

function computeReplacement(match: RegExpExecArray, replacement: string, mode: FindOptions['mode']): string {
  if (mode !== 'regex') return replacement
  return match[0].replace(/.*/, () =>
    replacement.replace(/\$(\$|&|\d{1,2})/g, (token, group: string) => {
      if (group === '$') return '$'
      if (group === '&') return match[0]
      const index = Number.parseInt(group, 10)
      return match[index] ?? token
    })
  )
}

function replacementText(options: FindOptions, replaceWith: string): string {
  return options.mode === 'extended' ? decodeExtendedEscapes(replaceWith, options.extendedUnicode) : replaceWith
}

export interface FindReplaceApi {
  findNext(): boolean
  findPrevious(): boolean
  replaceOne(): boolean
  replaceAll(): number
  countMatches(): number
  findAllInTabs(): number
  goToResult(result: FindResult): void
  clearSelectionRange(): void
}

export function useFindReplace(editorRef: RefObject<HTMLTextAreaElement | null>): FindReplaceApi {
  const { t } = useI18n()

  const selectMatch = useCallback(
    (tabId: string, content: string, match: MatchRange, focusEditor = false) => {
      const store = useSearchStore.getState()
      store.setLastMatch({ tabId, index: match.index, length: match.length })
      const end = match.index + match.length
      useTabStore.getState().updateTab(tabId, { cursorOffset: match.index, selectionEnd: end })
      const editor = editorRef.current
      if (editor) {
        if (focusEditor) editor.focus()
        editor.setSelectionRange(match.index, end)
        const before = content.slice(0, match.index)
        const lineIndex = before.split('\n').length - 1
        const lineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight) || EDITOR_LINE_HEIGHT_FALLBACK
        const top = Math.max(0, lineIndex * lineHeight - editor.clientHeight / 3)
        editor.scrollTo({ top, behavior: 'smooth' })
      }
    },
    [editorRef]
  )

  const collectMatches = useCallback((content: string, options: FindOptions): MatchRange[] => {
    const { start, end } = selectionBounds(content, options)
    const scoped = content.slice(start, end)
    const matches = findAll(scoped, buildRegExp(useSearchStore.getState().query, options))
    return matches.map((match) => ({ index: match.index + start, length: match.length }))
  }, [])

  const findNext = useCallback((): boolean => {
    const state = useSearchStore.getState()
    const tab = useTabStore.getState().getActive()
    if (!tab) return false
    try {
      if (!state.query) return false
      const matches = collectMatches(tab.fileContent, state.options)
      if (matches.length === 0) {
        state.setLastMatch(null)
        return false
      }
      const editor = editorRef.current
      const activeEditor = document.activeElement === editor
      const last = state.lastMatch?.tabId === tab.id ? state.lastMatch : null
      const anchor = last ? last.index + last.length : activeEditor ? (editor?.selectionEnd ?? 0) : 0
      let target = matches.find((match) => match.index >= anchor)
      if (!target && state.options.wrapAround) target = matches[0]
      if (!target) return false
      const current = target
      if (last && current.index === last.index && last.length === current.length) {
        const alternative = matches.find((match) => match.index > current.index)
        if (alternative) target = alternative
        else if (state.options.wrapAround) target = matches[0]
      }
      if (!target) return false
      selectMatch(tab.id, tab.fileContent, target)
      state.addHistory(state.query)
      return true
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast('error', t('find:invalidRegex'), described.detail || described.message)
      return false
    }
  }, [collectMatches, editorRef, selectMatch, t])

  const findPrevious = useCallback((): boolean => {
    const state = useSearchStore.getState()
    const tab = useTabStore.getState().getActive()
    if (!tab) return false
    try {
      if (!state.query) return false
      const matches = collectMatches(tab.fileContent, state.options)
      if (matches.length === 0) {
        state.setLastMatch(null)
        return false
      }
      const editor = editorRef.current
      const last = state.lastMatch?.tabId === tab.id ? state.lastMatch : null
      const anchor = last ? last.index : (editor?.selectionStart ?? tab.fileContent.length)
      let target = [...matches].reverse().find((match) => match.index < anchor)
      if (!target && state.options.wrapAround) target = matches[matches.length - 1]
      if (!target) return false
      selectMatch(tab.id, tab.fileContent, target)
      state.addHistory(state.query)
      return true
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast('error', t('find:invalidRegex'), described.detail || described.message)
      return false
    }
  }, [collectMatches, editorRef, selectMatch, t])

  const replaceOne = useCallback((): boolean => {
    const state = useSearchStore.getState()
    const tab = useTabStore.getState().getActive()
    const match = state.lastMatch
    if (!tab || !match || match.tabId !== tab.id) return findNext()
    try {
      const options = state.options
      const regex = buildRegExp(state.query, { ...options, inSelection: false })
      regex.lastIndex = match.index
      const found = regex.exec(tab.fileContent)
      if (!found || found.index !== match.index) return findNext()
      const replacement = replacementText(options, state.replaceWith)
      const value = computeReplacement(found, replacement, options.mode)
      const nextContent = `${tab.fileContent.slice(0, match.index)}${value}${tab.fileContent.slice(match.index + match.length)}`
      const editor = editorRef.current
      if (editor && document.activeElement === editor) {
        editor.setRangeText(value, match.index, match.index + match.length, 'end')
        useTabStore.getState().setBuffer(tab.id, editor.value)
      } else {
        useTabStore.getState().setBuffer(tab.id, nextContent)
        editor?.setSelectionRange(match.index + value.length, match.index + value.length)
      }
      useSearchStore.getState().setLastMatch(null)
      state.addHistory(state.query)
      return findNext()
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast('error', t('find:invalidRegex'), described.detail || described.message)
      return false
    }
  }, [editorRef, findNext, t])

  const replaceAll = useCallback((): number => {
    const state = useSearchStore.getState()
    const tab = useTabStore.getState().getActive()
    if (!tab) return 0
    try {
      const options = state.options
      const regex = buildRegExp(state.query, options)
      const bounds = selectionBounds(tab.fileContent, options)
      const scoped = tab.fileContent.slice(bounds.start, bounds.end)
      const matches = findAll(scoped, regex)
      if (matches.length === 0) return 0
      const literal = replacementText(options, state.replaceWith)
      const replacement = options.mode === 'regex' ? state.replaceWith : literal
      const replaced = options.mode === 'regex'
        ? scoped.replace(regex, replacement)
        : scoped.replace(regex, () => literal)
      const content = `${tab.fileContent.slice(0, bounds.start)}${replaced}${tab.fileContent.slice(bounds.end)}`
      useTabStore.getState().setBuffer(tab.id, content)
      useSearchStore.getState().setLastMatch(null)
      state.addHistory(state.query)
      const editor = editorRef.current
      if (editor) {
        editor.setSelectionRange(bounds.start, bounds.start + replaced.length)
        editor.focus()
      }
      return matches.length
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast('error', t('find:invalidRegex'), described.detail || described.message)
      return 0
    }
  }, [editorRef, t])

  const countMatches = useCallback((): number => {
    const state = useSearchStore.getState()
    const tab = useTabStore.getState().getActive()
    if (!tab || !state.query) return 0
    try {
      return collectMatches(tab.fileContent, state.options).length
    } catch {
      return 0
    }
  }, [collectMatches])

  const findAllInTabs = useCallback((): number => {
    const state = useSearchStore.getState()
    const tabs = useTabStore.getState().tabs
    try {
      const regexSource = buildRegExp(state.query, { ...state.options, inSelection: false })
      const results: FindResult[] = []
      let truncated = false
      for (const tab of tabs) {
        const regex = new RegExp(regexSource.source, regexSource.flags)
        const matches = findAll(tab.fileContent, regex)
        for (const match of matches) {
          if (results.length >= FIND_RESULTS_MAX) {
            truncated = true
            break
          }
          const { lineNumber, columnStart } = lineColumnAt(tab.fileContent, match.index)
          results.push({
            tabId: tab.id,
            filePath: tab.filePath ?? tab.displayName,
            lineNumber,
            columnStart,
            columnEnd: columnStart + match.length,
            preview: lineTextAt(tab.fileContent, match.index)
          })
        }
        if (truncated) break
      }
      state.addHistory(state.query)
      state.setAllResults(results, truncated)
      return results.length
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast('error', t('find:invalidRegex'), described.detail || described.message)
      return 0
    }
  }, [t])

  const goToResult = useCallback(
    (result: FindResult) => {
      const tabStore = useTabStore.getState()
      const tab =
        (result.tabId ? tabStore.tabs.find((item) => item.id === result.tabId) : undefined) ??
        tabStore.tabs.find((item) => item.filePath === result.filePath)
      if (!tab) return
      tabStore.activateTab(tab.id)
      const lines = tab.fileContent.split('\n')
      const lineStart = lines.slice(0, Math.max(0, result.lineNumber - 1)).reduce((total, line) => total + line.length + 1, 0)
      const start = lineStart + Math.max(0, result.columnStart - 1)
      const end = start + Math.max(0, result.columnEnd - result.columnStart)
      useSearchStore.getState().setLastMatch({ tabId: tab.id, index: start, length: end - start })
      window.setTimeout(() => {
        const editor = editorRef.current
        if (!editor) return
        editor.focus()
        editor.setSelectionRange(start, end)
        const lineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight) || EDITOR_LINE_HEIGHT_FALLBACK
        editor.scrollTo({ top: Math.max(0, (result.lineNumber - 1) * lineHeight - editor.clientHeight / 3), behavior: 'smooth' })
      }, 30)
    },
    [editorRef]
  )

  const clearSelectionRange = useCallback(() => {
    useSearchStore.getState().setSelectionRange(null)
  }, [])

  return { findNext, findPrevious, replaceOne, replaceAll, countMatches, findAllInTabs, goToResult, clearSelectionRange }
}
