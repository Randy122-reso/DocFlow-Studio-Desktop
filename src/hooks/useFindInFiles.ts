import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { FilePayload, FindFileChange, FindResult } from '../../electron/types/ipc'
import { useSearchStore } from '../store/searchStore'
import { useTabStore } from '../store/tabStore'
import { useFileStore } from '../store/fileStore'
import { describeError } from '../utils/errors'
import { useI18n } from './useI18n'
import { useFindReplace } from './useFindReplace'

export interface FindInFilesApi {
  pickRoot(): Promise<boolean>
  search(): Promise<number>
  cancel(): Promise<void>
  previewReplace(): Promise<FindFileChange[]>
  applyReplace(): Promise<boolean>
  openResult(result: FindResult): Promise<void>
  clear(): void
}

async function readPayload(path: string): Promise<FilePayload | null> {
  const result = await window.docflow.file.openPath(path)
  if (result.cancelled) return null
  return result
}

export function useFindInFiles(editorRef: RefObject<HTMLTextAreaElement | null>): FindInFilesApi {
  const { t } = useI18n()
  const { goToResult } = useFindReplace(editorRef)

  const pickRoot = useCallback(async (): Promise<boolean> => {
    try {
      const picked = await window.docflow.file.pickDirectory()
      if (picked.cancelled || !picked.path) return false
      useSearchStore.getState().setInFilesRoot(picked.path)
      useSearchStore.getState().resetInFiles()
      return true
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast(described.kind, t('find:searchFailed'), described.detail || described.message)
      return false
    }
  }, [t])

  const search = useCallback(async (): Promise<number> => {
    const state = useSearchStore.getState()
    if (!state.inFilesRoot) {
      useFileStore.getState().showToast('warning', t('find:chooseFolder'), '')
      return 0
    }
    if (!state.query.trim()) return 0
    state.setInFilesBusy(true)
    state.setInFilesError(null)
    state.setReplacePreview(null)
    try {
      const response = await window.docflow.find.inFiles({
        rootDir: state.inFilesRoot,
        glob: state.inFilesGlob || '**/*.{md,markdown,txt}',
        query: state.query,
        options: { ...state.options, inSelection: false },
        maxResults: 10_000
      })
      useSearchStore.getState().setInFilesResults({
        results: response.results,
        truncated: response.truncated,
        filesScanned: response.filesScanned
      })
      if (response.cancelled) {
        useFileStore.getState().showToast('info', t('find:stop'), '')
      }
      return response.results.length
    } catch (error) {
      const described = describeError(error)
      useSearchStore.getState().setInFilesError(described.detail || described.message)
      useFileStore.getState().showToast(described.kind, t('find:searchFailed'), described.detail || described.message)
      return 0
    } finally {
      useSearchStore.getState().setInFilesBusy(false)
    }
  }, [t])

  const cancel = useCallback(async (): Promise<void> => {
    try {
      await window.docflow.find.cancel()
    } catch {
      // Cancelling is best effort.
    } finally {
      useSearchStore.getState().setInFilesBusy(false)
    }
  }, [])

  const runReplace = useCallback(
    async (dryRun: boolean) => {
      const state = useSearchStore.getState()
      if (!state.inFilesRoot || !state.query.trim()) {
        useFileStore.getState().showToast('warning', t('find:chooseFolder'), '')
        return null
      }
      state.setReplaceBusy(true)
      try {
        const response = await window.docflow.find.replaceInFiles({
          rootDir: state.inFilesRoot,
          glob: state.inFilesGlob || '**/*.{md,markdown,txt}',
          query: state.query,
          replaceWith: state.replaceWith,
          options: { ...state.options, inSelection: false },
          dryRun
        })
        useSearchStore.getState().setReplacePreview(response.changes)
        return response
      } catch (error) {
        const described = describeError(error)
        useFileStore.getState().showToast(described.kind, t('find:searchFailed'), described.detail || described.message)
        return null
      } finally {
        useSearchStore.getState().setReplaceBusy(false)
      }
    },
    [t]
  )

  const previewReplace = useCallback(async (): Promise<FindFileChange[]> => {
    const response = await runReplace(true)
    if (!response) return []
    if (!response.cancelled) {
      useFileStore.getState().showToast('info', t('find:dryRunDone'), '')
    }
    return response.changes
  }, [runReplace, t])

  const applyReplace = useCallback(async (): Promise<boolean> => {
    const state = useSearchStore.getState()
    if (!state.replacePreview || state.replacePreview.length === 0) return false
    const detail = state.replacePreview
      .slice(0, 12)
      .map((change) => `${change.path} (${change.count})\n${change.diff.split('\n').slice(0, 3).join('\n')}`)
      .join('\n\n')
    const choice = await window.docflow.dialog
      .message({
        type: 'question',
        title: t('find:replaceInFiles'),
        message: t('find:changes', { count: state.replacePreview.length }),
        detail: detail.slice(0, 8000),
        buttons: [t('find:writeChanges'), t('cancel')],
        defaultId: 0,
        cancelId: 1
      })
      .catch(() => 1)
    if (choice !== 0) return false

    const response = await runReplace(false)
    if (!response || response.cancelled || !response.written) return false

    const changed = new Set(response.changes.map((change) => change.path))
    const openTabs = useTabStore.getState().tabs.filter((tab) => tab.filePath && changed.has(tab.filePath))
    for (const tab of openTabs) {
      if (!tab.filePath) continue
      try {
        const payload = await window.docflow.file.read(tab.filePath)
        if (payload.cancelled) continue
        useTabStore.getState().updateTab(tab.id, {
          displayName: payload.name,
          fileContent: payload.content,
          savedContent: payload.content,
          diskMtime: payload.mtime,
          encoding: payload.encoding,
          lineEnding: payload.lineEnding,
          conflict: null,
          externalChange: null
        })
      } catch {
        // A file may have been removed between replace and refresh.
      }
    }
    useFileStore.getState().showToast('success', t('find:writeDone', { count: response.changes.length }), '')
    await search()
    return true
  }, [runReplace, search, t])

  const openResult = useCallback(
    async (result: FindResult): Promise<void> => {
      const store = useTabStore.getState()
      const existing = store.tabs.find((tab) => tab.filePath === result.filePath)
      if (existing) {
        store.activateTab(existing.id)
        goToResult({ ...result, tabId: existing.id })
        return
      }
      try {
        const payload = await readPayload(result.filePath)
        if (!payload) return
        const opened = useTabStore.getState().openTab(payload)
        if (!opened.ok || !opened.id) return
        useTabStore.getState().activateTab(opened.id)
        goToResult({ ...result, tabId: opened.id })
      } catch (error) {
        const described = describeError(error)
        useFileStore.getState().showToast(described.kind, t('find:searchFailed'), described.detail || described.message)
      }
    },
    [goToResult, t]
  )

  const clear = useCallback((): void => {
    useSearchStore.getState().resetInFiles()
  }, [])

  return { pickRoot, search, cancel, previewReplace, applyReplace, openResult, clear }
}
