import { useCallback, useEffect } from 'react'
import { useUpdateStore } from '../store/updateStore'
import { useFileStore } from '../store/fileStore'
import { describeError } from '../utils/errors'
import { useI18n } from './useI18n'

export interface UpdateApi {
  check(): Promise<void>
  download(): Promise<void>
  install(): Promise<void>
  cancel(): Promise<void>
  skip(): void
  dismiss(): void
}

export function useUpdate(): UpdateApi {
  const { t } = useI18n()
  const setUpdate = useUpdateStore((state) => state.setUpdate)
  const setSkippedVersion = useUpdateStore((state) => state.setSkippedVersion)
  const setDismissedVersion = useUpdateStore((state) => state.setDismissedVersion)

  useEffect(() => {
    let disposed = false
    const api = window.docflow?.update
    if (!api) return
    const apply = (state: Parameters<typeof setUpdate>[0]) => {
      if (!disposed) setUpdate(state)
    }
    void api.status().then(apply).catch(() => undefined)
    const unsubscribe = api.onStatus(apply)
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [setUpdate])

  const check = useCallback(async (): Promise<void> => {
    try {
      const state = await window.docflow.update.check()
      setUpdate(state)
      if (state.status === 'idle' && !state.availableVersion) {
        useFileStore.getState().showToast('info', t('update.upToDate'))
      }
      if (state.status === 'error') {
        useFileStore.getState().showToast('warning', t('update.error'), state.error ?? undefined)
      }
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast(described.kind, t('update.error'), described.detail)
    }
  }, [setUpdate, t])

  const download = useCallback(async (): Promise<void> => {
    try {
      const state = await window.docflow.update.download()
      setUpdate(state)
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast(described.kind, t('update.error'), described.detail)
    }
  }, [setUpdate, t])

  const install = useCallback(async (): Promise<void> => {
    try {
      await window.docflow.update.install()
    } catch (error) {
      const described = describeError(error)
      useFileStore.getState().showToast(described.kind, t('update.error'), described.detail)
    }
  }, [t])

  const cancel = useCallback(async (): Promise<void> => {
    try {
      const state = await window.docflow.update.cancel()
      setUpdate(state)
    } catch {
      // Cancelling is best effort.
    }
  }, [setUpdate])

  const skip = useCallback((): void => {
    const version = useUpdateStore.getState().update.availableVersion
    setSkippedVersion(version)
    setDismissedVersion(version)
  }, [setDismissedVersion, setSkippedVersion])

  const dismiss = useCallback((): void => {
    setDismissedVersion(useUpdateStore.getState().update.availableVersion)
  }, [setDismissedVersion])

  return { check, download, install, cancel, skip, dismiss }
}
