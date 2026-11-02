import { useCallback, useEffect, useRef } from 'react'
import type { FilePayload } from '../../electron/types/ipc'
import { useFileStore, isDirty } from '../store/fileStore'
import { describeError } from '../utils/errors'

const SAVE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
  { name: 'All Files', extensions: ['*'] }
]

function toastError(error: unknown): void {
  const described = describeError(error)
  useFileStore.getState().showToast(described.kind, described.message, described.detail)
}

export interface FileSessionApi {
  openDialog(): Promise<boolean>
  openPath(path: string, force?: boolean): Promise<boolean>
  save(): Promise<boolean>
  saveAs(): Promise<boolean>
  newDocument(): Promise<boolean>
  requestSaveAndClose(): Promise<void>
  overwriteConflict(): Promise<void>
  reloadConflict(): Promise<void>
  saveAsConflict(): Promise<void>
  reloadExternal(): Promise<void>
  dismissExternal(): void
  togglePin(path: string): Promise<void>
  removeRecent(path: string): Promise<void>
  clearRecent(): Promise<void>
  openRecent(path: string): Promise<boolean>
  saveDraftNow(): Promise<void>
}

export function useFileSession(): FileSessionApi {
  const savingRef = useRef(false)
  const watchedRef = useRef<string | null>(null)

  const unwatchCurrent = useCallback(async (nextPath: string | null): Promise<void> => {
    const previous = watchedRef.current
    if (!previous || previous === nextPath) return
    watchedRef.current = null
    await window.docflow.file.unwatch(previous).catch(() => undefined)
  }, [])

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    const state = useFileStore.getState()
    if (!isDirty(state)) return true
    try {
      const choice = await window.docflow.dialog.confirmUnsaved(state.fileName)
      if (choice === 'cancel') return false
      if (choice === 'discard') return true
      return await saveInternal(false)
    } catch (error) {
      toastError(error)
      return false
    }
  }, [])

  const applyOpenedPayload = useCallback(async (payload: FilePayload) => {
    const store = useFileStore.getState()
    store.loadDocument(payload)
    await window.docflow.recent.add({
      path: payload.path,
      displayName: payload.name,
      size: payload.size
    })
    const files = await window.docflow.recent.list()
    useFileStore.getState().setRecents(files)
    await unwatchCurrent(payload.path)
    await window.docflow.file.watch(payload.path)
    watchedRef.current = payload.path
    useFileStore.getState().showToast('success', `Opened ${payload.name}`, payload.path)
  }, [unwatchCurrent])

  const openPath = useCallback(
    async (path: string, force = false): Promise<boolean> => {
      if (!force && !(await confirmNavigation())) return false
      try {
        const result = await window.docflow.file.openPath(path)
        if (result.cancelled) return false
        await applyOpenedPayload(result)
        return true
      } catch (error) {
        toastError(error)
        return false
      }
    },
    [applyOpenedPayload, confirmNavigation]
  )

  const saveInternal = useCallback(async (forceDialog: boolean): Promise<boolean> => {
    if (savingRef.current) return false
    savingRef.current = true
    try {
      const state = useFileStore.getState()
      if (state.filePath && !forceDialog) {
        const result = await window.docflow.file.save({
          path: state.filePath,
          content: state.content,
          expectedMtime: state.diskMtime
        })
        if (result.conflict) {
          useFileStore.getState().setConflict({ diskMtime: result.diskMtime ?? 0 })
          useFileStore.getState().showToast('warning', 'The file changed on disk', 'Choose how to resolve the conflict.')
          return false
        }
        if (!result.ok || !result.path || result.mtime === undefined) {
          throw new Error('WRITE_FAILED: The file could not be saved')
        }
        const current = useFileStore.getState()
        current.markSaved(result.path, current.content, result.mtime)
        await window.docflow.session.clear()
        await window.docflow.recent.add({
          path: result.path,
          displayName: result.path.split(/[\\/]/).pop(),
          size: result.size
        })
        const files = await window.docflow.recent.list()
        useFileStore.getState().setRecents(files)
        useFileStore.getState().showToast('success', 'Saved', result.path)
        return true
      }

      const result = await window.docflow.file.saveAs({
        content: state.content,
        defaultName: state.fileName,
        filters: SAVE_FILTERS
      })
      if (result.cancelled) return false
      if (!result.ok || !result.path || result.mtime === undefined) {
        if (result.conflict) {
          useFileStore.getState().setConflict({ diskMtime: result.diskMtime ?? 0 })
          return false
        }
        throw new Error('WRITE_FAILED: The file could not be saved')
      }
      const current = useFileStore.getState()
      current.markSaved(result.path, current.content, result.mtime)
      await window.docflow.session.clear()
      await window.docflow.recent.add({
        path: result.path,
        displayName: result.path.split(/[\\/]/).pop(),
        size: result.size
      })
      const files = await window.docflow.recent.list()
      useFileStore.getState().setRecents(files)
      await unwatchCurrent(result.path)
      await window.docflow.file.watch(result.path)
      watchedRef.current = result.path
      useFileStore.getState().showToast('success', 'Saved', result.path)
      return true
    } catch (error) {
      toastError(error)
      return false
    } finally {
      savingRef.current = false
    }
  }, [unwatchCurrent])

  const save = useCallback(async () => saveInternal(false), [saveInternal])
  const saveAs = useCallback(async () => saveInternal(true), [saveInternal])

  const openDialog = useCallback(async (): Promise<boolean> => {
    if (!(await confirmNavigation())) return false
    try {
      const result = await window.docflow.file.openDialog()
      if (result.cancelled) return false
      await applyOpenedPayload(result)
      return true
    } catch (error) {
      toastError(error)
      return false
    }
  }, [applyOpenedPayload, confirmNavigation])

  const newDocument = useCallback(async (): Promise<boolean> => {
    if (!(await confirmNavigation())) return false
    await unwatchCurrent(null)
    useFileStore.getState().newDocument('')
    await window.docflow.session.clear()
    useFileStore.getState().showToast('info', 'New document', 'Start writing — Ctrl+S will choose a location.')
    return true
  }, [confirmNavigation, unwatchCurrent])

  const requestSaveAndClose = useCallback(async (): Promise<void> => {
    const ok = await saveInternal(false)
    if (ok) {
      await window.docflow.window.closeConfirmed()
    }
  }, [saveInternal])

  const overwriteConflict = useCallback(async (): Promise<void> => {
    const state = useFileStore.getState()
    if (!state.filePath) return
    useFileStore.getState().setConflict(null)
    try {
      const result = await window.docflow.file.save({
        path: state.filePath,
        content: state.content,
        expectedMtime: null
      })
      if (result.ok && result.path && result.mtime !== undefined) {
        useFileStore.getState().markSaved(result.path, state.content, result.mtime)
        await window.docflow.session.clear()
        await window.docflow.recent.add({ path: result.path, size: result.size })
        const files = await window.docflow.recent.list()
        useFileStore.getState().setRecents(files)
        useFileStore.getState().showToast('success', 'Overwritten', result.path)
      } else {
        throw new Error('WRITE_FAILED: The file could not be written')
      }
    } catch (error) {
      toastError(error)
    }
  }, [])

  const reloadConflict = useCallback(async (): Promise<void> => {
    const state = useFileStore.getState()
    if (!state.filePath) return
    useFileStore.getState().setConflict(null)
    await openPath(state.filePath, true)
  }, [openPath])

  const saveAsConflict = useCallback(async (): Promise<void> => {
    useFileStore.getState().setConflict(null)
    await saveInternal(true)
  }, [saveInternal])

  const reloadExternal = useCallback(async (): Promise<void> => {
    const change = useFileStore.getState().externalChange
    if (!change) return
    useFileStore.getState().setExternalChange(null)
    await openPath(change.path, false)
  }, [openPath])

  const dismissExternal = useCallback((): void => {
    useFileStore.getState().setExternalChange(null)
  }, [])

  const togglePin = useCallback(async (path: string): Promise<void> => {
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

  const saveDraftNow = useCallback(async (): Promise<void> => {
    const state = useFileStore.getState()
    if (!isDirty(state)) return
    try {
      await window.docflow.session.save({
        filePath: state.filePath,
        fileName: state.fileName,
        fileContent: state.content,
        savedContent: state.savedContent,
        diskMtime: state.diskMtime,
        encoding: state.encoding,
        lineEnding: state.lineEnding,
        dirty: true,
        timestamp: Date.now()
      })
    } catch {
      // Recovery is best effort; never interrupt typing.
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.docflow.file.onExternalChange((event) => {
      const state = useFileStore.getState()
      if (state.filePath !== event.path) return
      if (state.diskMtime !== null && Math.abs(state.diskMtime - event.mtime) < 1000) return
      useFileStore.getState().setExternalChange(event)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    const schedule = () => {
      const state = useFileStore.getState()
      if (!isDirty(state)) {
        if (timer) clearTimeout(timer)
        timer = null
        return
      }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void saveDraftNow()
      }, 1500)
    }

    schedule()
    interval = setInterval(() => {
      if (isDirty(useFileStore.getState())) void saveDraftNow()
    }, 5000)

    const unsubscribe = useFileStore.subscribe((state, previous) => {
      if (
        state.content !== previous.content ||
        state.filePath !== previous.filePath ||
        state.savedContent !== previous.savedContent
      ) {
        schedule()
      }
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
      if (interval) clearInterval(interval)
    }
  }, [saveDraftNow])

  return {
    openDialog,
    openPath,
    save,
    saveAs,
    newDocument,
    requestSaveAndClose,
    overwriteConflict,
    reloadConflict,
    saveAsConflict,
    reloadExternal,
    dismissExternal,
    togglePin,
    removeRecent,
    clearRecent,
    openRecent: openPath,
    saveDraftNow
  }
}
