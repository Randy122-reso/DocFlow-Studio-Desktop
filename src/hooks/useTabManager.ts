import { useCallback, useEffect, useRef } from 'react'
import type { FilePayload, TabSnapshot } from '../../electron/types/ipc'
import type { DocumentTab } from '../store/tabStore'
import { useTabStore } from '../store/tabStore'
import { useFileStore } from '../store/fileStore'
import { describeError } from '../utils/errors'
import { useI18n } from './useI18n'

const SAVE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
  { name: 'All Files', extensions: ['*'] }
]

function toastError(error: unknown): void {
  const described = describeError(error)
  useFileStore.getState().showToast(described.kind, described.message, described.detail)
}

export interface TabManagerApi {
  openDialog(): Promise<boolean>
  openPath(path: string, force?: boolean): Promise<boolean>
  newTab(): Promise<boolean>
  save(tabId?: string): Promise<boolean>
  saveAs(tabId?: string): Promise<boolean>
  saveAll(): Promise<boolean>
  closeTab(tabId: string): Promise<boolean>
  closeOthers(tabId: string): Promise<void>
  closeToRight(tabId: string): Promise<void>
  closeToLeft(tabId: string): Promise<void>
  closeAll(): Promise<void>
  requestSaveAndClose(): Promise<void>
  discardAndClose(): Promise<void>
  overwriteConflict(tabId?: string): Promise<void>
  reloadConflict(tabId?: string): Promise<void>
  saveAsConflict(tabId?: string): Promise<void>
  reloadExternal(tabId?: string): Promise<void>
  refreshFromDisk(tabId: string): Promise<void>
  dismissExternal(tabId?: string): void
  togglePin(tabId?: string): void
  refreshRecents(): Promise<void>
  toggleRecentPin(path: string): Promise<void>
  removeRecent(path: string): Promise<void>
  clearRecent(): Promise<void>
  openRecent(path: string): Promise<boolean>
}

export function useTabManager(): TabManagerApi {
  const { t } = useI18n()
  const savingRef = useRef<Set<string>>(new Set())
  const watchedRef = useRef<Set<string>>(new Set())

  const refreshRecents = useCallback(async (): Promise<void> => {
    try {
      const files = await window.docflow.recent.list()
      useFileStore.getState().setRecents(files)
    } catch {
      // Recent files are a convenience; never block document work on them.
    }
  }, [])

  const addRecent = useCallback(async (payload: FilePayload): Promise<void> => {
    try {
      const files = await window.docflow.recent.add({
        path: payload.path,
        displayName: payload.name,
        size: payload.size
      })
      useFileStore.getState().setRecents(files)
    } catch {
      // Best effort only.
    }
  }, [])

  const openPath = useCallback(
    async (path: string, force = false): Promise<boolean> => {
      const store = useTabStore.getState()
      const existing = store.tabs.find((tab) => tab.filePath === path)
      if (existing && !force) {
        store.activateTab(existing.id)
        return true
      }
      try {
        const result = await window.docflow.file.openPath(path)
        if (result.cancelled) return false
        if (existing && force) {
          useTabStore.getState().updateTab(existing.id, {
            displayName: result.name,
            fileContent: result.content,
            savedContent: result.content,
            diskMtime: result.mtime,
            encoding: result.encoding,
            lineEnding: result.lineEnding,
            conflict: null,
            externalChange: null
          })
          useTabStore.getState().activateTab(existing.id)
        } else {
          const opened = useTabStore.getState().openTab(result)
          if (!opened.ok) {
            if (opened.reason === 'max') {
              useFileStore
                .getState()
                .showToast('warning', t('tabs.maxTabsReached'), t('tabs.maxTabsDetail'))
            }
            if (opened.id) useTabStore.getState().activateTab(opened.id)
            return opened.ok
          }
          if (opened.id) useTabStore.getState().activateTab(opened.id)
        }
        await addRecent(result)
        useFileStore.getState().showToast('success', `${t('common.open')} ${result.name}`, result.path)
        return true
      } catch (error) {
        toastError(error)
        return false
      }
    },
    [addRecent, t]
  )

  const openDialog = useCallback(async (): Promise<boolean> => {
    try {
      const result = await window.docflow.file.openDialog()
      if (result.cancelled) return false
      const existing = useTabStore.getState().tabs.find((tab) => tab.filePath === result.path)
      if (existing) {
        useTabStore.getState().activateTab(existing.id)
        return true
      }
      const opened = useTabStore.getState().openTab(result)
      if (!opened.ok) {
        if (opened.reason === 'max') {
          useFileStore.getState().showToast('warning', t('tabs.maxTabsReached'), t('tabs.maxTabsDetail'))
        }
        return false
      }
      if (opened.id) useTabStore.getState().activateTab(opened.id)
      await addRecent(result)
      return true
    } catch (error) {
      toastError(error)
      return false
    }
  }, [addRecent, t])

  const newTab = useCallback(async (): Promise<boolean> => {
    const created = useTabStore.getState().newTab('')
    if (!created.ok) {
      useFileStore.getState().showToast('warning', t('tabs.maxTabsReached'), t('tabs.maxTabsDetail'))
      return false
    }
    return true
  }, [t])

  const saveTabInternal = useCallback(
    async (tabId: string, forceDialog: boolean): Promise<boolean> => {
      if (savingRef.current.has(tabId)) return false
      const tab = useTabStore.getState().getTab(tabId)
      if (!tab) return false
      savingRef.current.add(tabId)
      try {
        if (tab.filePath && !forceDialog) {
          const result = await window.docflow.file.save({
            path: tab.filePath,
            content: tab.fileContent,
            expectedMtime: tab.diskMtime
          })
          if (result.conflict) {
            useTabStore.getState().activateTab(tab.id)
            useTabStore.getState().setConflict(tab.id, { diskMtime: result.diskMtime ?? 0 })
            useFileStore.getState().showToast('warning', t('errors.conflict'), t('errors.conflictDetail'))
            return false
          }
          if (!result.ok || !result.path || result.mtime === undefined) {
            throw new Error('WRITE_FAILED: The file could not be saved')
          }
          useTabStore.getState().markSaved(tab.id, result.path, tab.fileContent, result.mtime)
          await addRecent({
            path: result.path,
            name: result.path.split(/[\\/]/).pop() ?? tab.displayName,
            content: tab.fileContent,
            size: result.size ?? tab.fileContent.length,
            mtime: result.mtime,
            encoding: tab.encoding,
            lineEnding: tab.lineEnding
          })
          useFileStore.getState().showToast('success', t('common.saved'), result.path)
          return true
        }

        const result = await window.docflow.file.saveAs({
          content: tab.fileContent,
          defaultName: tab.displayName,
          filters: SAVE_FILTERS
        })
        if (result.cancelled) return false
        if (result.conflict) {
          useTabStore.getState().setConflict(tab.id, { diskMtime: result.diskMtime ?? 0 })
          return false
        }
        if (!result.ok || !result.path || result.mtime === undefined) {
          throw new Error('WRITE_FAILED: The file could not be saved')
        }
        useTabStore.getState().markSaved(tab.id, result.path, tab.fileContent, result.mtime)
        await addRecent({
          path: result.path,
          name: result.path.split(/[\\/]/).pop() ?? tab.displayName,
          content: tab.fileContent,
          size: result.size ?? tab.fileContent.length,
          mtime: result.mtime,
          encoding: tab.encoding,
          lineEnding: tab.lineEnding
        })
        useFileStore.getState().showToast('success', t('common.saved'), result.path)
        return true
      } catch (error) {
        toastError(error)
        return false
      } finally {
        savingRef.current.delete(tabId)
      }
    },
    [addRecent, t]
  )

  const save = useCallback(
    async (tabId?: string): Promise<boolean> => {
      const id = tabId ?? useTabStore.getState().activeTabId
      return id ? saveTabInternal(id, false) : false
    },
    [saveTabInternal]
  )

  const saveAs = useCallback(
    async (tabId?: string): Promise<boolean> => {
      const id = tabId ?? useTabStore.getState().activeTabId
      return id ? saveTabInternal(id, true) : false
    },
    [saveTabInternal]
  )

  const saveAll = useCallback(async (): Promise<boolean> => {
    const dirtyTabs = useTabStore.getState().tabs.filter((tab) => tab.fileContent !== tab.savedContent)
    for (const tab of dirtyTabs) {
      const saved = await saveTabInternal(tab.id, false)
      if (!saved) return false
    }
    return true
  }, [saveTabInternal])

  const confirmClose = useCallback(
    async (tab: DocumentTab): Promise<boolean> => {
      if (tab.isPinned) {
        const response = await window.docflow.dialog.message({
          type: 'question',
          title: t('tabs.pinnedTitle'),
          message: t('tabs.pinnedMessage', { name: tab.displayName }),
          buttons: [t('tabs.unpinAndClose'), t('common.cancel')],
          defaultId: 0,
          cancelId: 1
        })
        if (response !== 0) return false
        useTabStore.getState().togglePin(tab.id)
      }
      if (tab.fileContent === tab.savedContent) return true
      const choice = await window.docflow.dialog.confirmUnsaved(tab.displayName)
      if (choice === 'cancel') return false
      if (choice === 'discard') return true
      return saveTabInternal(tab.id, false)
    },
    [saveTabInternal, t]
  )

  const closeTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const tab = useTabStore.getState().getTab(tabId)
      if (!tab) return false
      try {
        if (!(await confirmClose(tab))) return false
        useTabStore.getState().closeTab(tabId)
        return true
      } catch (error) {
        toastError(error)
        return false
      }
    },
    [confirmClose]
  )

  const closeMany = useCallback(
    async (ids: string[]): Promise<void> => {
      for (const id of ids) {
        const tab = useTabStore.getState().getTab(id)
        if (!tab || tab.isPinned) continue
        const closed = await closeTab(id)
        if (!closed) break
      }
    },
    [closeTab]
  )

  const closeOthers = useCallback(
    async (tabId: string): Promise<void> => {
      const tabs = useTabStore.getState().tabs
      await closeMany(tabs.filter((tab) => tab.id !== tabId && !tab.isPinned).map((tab) => tab.id))
    },
    [closeMany]
  )

  const closeToRight = useCallback(
    async (tabId: string): Promise<void> => {
      const tabs = useTabStore.getState().tabs
      const index = tabs.findIndex((tab) => tab.id === tabId)
      if (index < 0) return
      await closeMany(tabs.slice(index + 1).filter((tab) => !tab.isPinned).map((tab) => tab.id))
    },
    [closeMany]
  )

  const closeToLeft = useCallback(
    async (tabId: string): Promise<void> => {
      const tabs = useTabStore.getState().tabs
      const index = tabs.findIndex((tab) => tab.id === tabId)
      if (index < 0) return
      await closeMany(tabs.slice(0, index).filter((tab) => !tab.isPinned).map((tab) => tab.id))
    },
    [closeMany]
  )

  const closeAll = useCallback(async (): Promise<void> => {
    const ids = useTabStore
      .getState()
      .tabs.filter((tab) => !tab.isPinned)
      .map((tab) => tab.id)
    await closeMany(ids)
  }, [closeMany])

  const requestSaveAndClose = useCallback(async (): Promise<void> => {
    const dirtyTabs = useTabStore.getState().tabs.filter((tab) => tab.fileContent !== tab.savedContent)
    for (const tab of dirtyTabs) {
      const saved = await saveTabInternal(tab.id, false)
      if (!saved) return
    }
    await window.docflow.window.closeConfirmed().catch(() => undefined)
  }, [saveTabInternal])

  const discardAndClose = useCallback(async (): Promise<void> => {
    await window.docflow.window.closeConfirmed().catch(() => undefined)
  }, [])

  const applyDiskContent = useCallback(async (tabId: string, path: string): Promise<void> => {
    const result = await window.docflow.file.read(path)
    if (result.cancelled) return
    useTabStore.getState().updateTab(tabId, {
      displayName: result.name,
      fileContent: result.content,
      savedContent: result.content,
      diskMtime: result.mtime,
      encoding: result.encoding,
      lineEnding: result.lineEnding,
      conflict: null,
      externalChange: null
    })
  }, [])

  const overwriteConflict = useCallback(
    async (tabId?: string): Promise<void> => {
      const tab = useTabStore.getState().getTab(tabId ?? useTabStore.getState().activeTabId ?? '')
      if (!tab?.filePath) return
      useTabStore.getState().setConflict(tab.id, null)
      try {
        const result = await window.docflow.file.save({
          path: tab.filePath,
          content: tab.fileContent,
          expectedMtime: null
        })
        if (!result.ok || !result.path || result.mtime === undefined) {
          throw new Error('WRITE_FAILED: The file could not be written')
        }
        useTabStore.getState().markSaved(tab.id, result.path, tab.fileContent, result.mtime)
        await addRecent({
          path: result.path,
          name: result.path.split(/[\\/]/).pop() ?? tab.displayName,
          content: tab.fileContent,
          size: result.size ?? tab.fileContent.length,
          mtime: result.mtime,
          encoding: tab.encoding,
          lineEnding: tab.lineEnding
        })
        useFileStore.getState().showToast('success', t('common.saved'), result.path)
      } catch (error) {
        toastError(error)
      }
    },
    [addRecent, t]
  )

  const reloadConflict = useCallback(
    async (tabId?: string): Promise<void> => {
      const tab = useTabStore.getState().getTab(tabId ?? useTabStore.getState().activeTabId ?? '')
      if (!tab?.filePath) return
      useTabStore.getState().setConflict(tab.id, null)
      try {
        await applyDiskContent(tab.id, tab.filePath)
      } catch (error) {
        toastError(error)
      }
    },
    [applyDiskContent]
  )

  const saveAsConflict = useCallback(
    async (tabId?: string): Promise<void> => {
      const tab = useTabStore.getState().getTab(tabId ?? useTabStore.getState().activeTabId ?? '')
      if (!tab) return
      useTabStore.getState().setConflict(tab.id, null)
      await saveTabInternal(tab.id, true)
    },
    [saveTabInternal]
  )

  const reloadExternal = useCallback(
    async (tabId?: string): Promise<void> => {
      const tab = useTabStore.getState().getTab(tabId ?? useTabStore.getState().activeTabId ?? '')
      if (!tab?.filePath) return
      try {
        await applyDiskContent(tab.id, tab.filePath)
      } catch (error) {
        toastError(error)
      }
    },
    [applyDiskContent]
  )

  const refreshFromDisk = useCallback(
    async (tabId: string): Promise<void> => {
      const tab = useTabStore.getState().getTab(tabId)
      if (!tab?.filePath) return
      try {
        await applyDiskContent(tab.id, tab.filePath)
        useTabStore.getState().setExternalChange(tab.id, null)
      } catch (error) {
        toastError(error)
      }
    },
    [applyDiskContent]
  )

  const dismissExternal = useCallback((tabId?: string): void => {
    const id = tabId ?? useTabStore.getState().activeTabId
    if (id) useTabStore.getState().setExternalChange(id, null)
  }, [])

  const togglePin = useCallback((tabId?: string): void => {
    const id = tabId ?? useTabStore.getState().activeTabId
    if (id) useTabStore.getState().togglePin(id)
  }, [])

  const toggleRecentPin = useCallback(async (path: string): Promise<void> => {
    try {
      const files = await window.docflow.recent.pin(path)
      useFileStore.getState().setRecents(files)
    } catch (error) {
      toastError(error)
    }
  }, [])

  const removeRecent = useCallback(async (path: string): Promise<void> => {
    try {
      const files = await window.docflow.recent.remove(path)
      useFileStore.getState().setRecents(files)
    } catch (error) {
      toastError(error)
    }
  }, [])

  const clearRecent = useCallback(async (): Promise<void> => {
    try {
      const files = await window.docflow.recent.clear(true)
      useFileStore.getState().setRecents(files)
    } catch (error) {
      toastError(error)
    }
  }, [])

  useEffect(() => {
    let lastSignature = ''
    const reconcileWatchers = () => {
      const paths = new Set(
        useTabStore
          .getState()
          .tabs.map((tab) => tab.filePath)
          .filter((path): path is string => Boolean(path))
      )
      const signature = [...paths].sort().join('\n')
      if (signature === lastSignature) return
      lastSignature = signature
      for (const path of [...watchedRef.current]) {
        if (!paths.has(path)) {
          watchedRef.current.delete(path)
          void window.docflow.file.unwatch(path).catch(() => undefined)
        }
      }
      for (const path of paths) {
        if (watchedRef.current.has(path)) continue
        watchedRef.current.add(path)
        void window.docflow.file.watch(path).catch(() => watchedRef.current.delete(path))
      }
    }

    reconcileWatchers()
    const unsubscribeStore = useTabStore.subscribe(reconcileWatchers)
    const unsubscribeExternal = window.docflow.file.onExternalChange((event) => {
      const tabs = useTabStore.getState().tabs.filter((tab) => tab.filePath === event.path)
      for (const tab of tabs) {
        if (tab.diskMtime !== null && Math.abs(tab.diskMtime - event.mtime) < 1000) continue
        useTabStore.getState().setExternalChange(tab.id, event)
      }
    })

    return () => {
      unsubscribeStore()
      unsubscribeExternal()
      for (const path of watchedRef.current) {
        void window.docflow.file.unwatch(path).catch(() => undefined)
      }
      watchedRef.current.clear()
    }
  }, [])

  return {
    openDialog,
    openPath,
    newTab,
    save,
    saveAs,
    saveAll,
    closeTab,
    closeOthers,
    closeToRight,
    closeToLeft,
    closeAll,
    requestSaveAndClose,
    discardAndClose,
    overwriteConflict,
    reloadConflict,
    saveAsConflict,
    reloadExternal,
    refreshFromDisk,
    dismissExternal,
    togglePin,
    refreshRecents,
    toggleRecentPin,
    removeRecent,
    clearRecent,
    openRecent: openPath
  }
}

export type { DocumentTab, TabSnapshot }
