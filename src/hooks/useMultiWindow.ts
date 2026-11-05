import { useCallback } from 'react'
import { useTabStore } from '../store/tabStore'
import { useFileStore } from '../store/fileStore'
import { describeError } from '../utils/errors'
import { useI18n } from './useI18n'

export interface MultiWindowApi {
  detachTab(tabId: string): Promise<boolean>
  newWindow(): Promise<boolean>
}

export function useMultiWindow(): MultiWindowApi {
  const { t } = useI18n()

  const detachTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const store = useTabStore.getState()
      const tab = store.getTab(tabId)
      if (!tab) return false
      if (!store.windowId) return false
      const snapshot = store.toSnapshots().find((item) => item.id === tabId)
      if (!snapshot) return false
      try {
        await window.docflow.window.detachTab({ sourceWindowId: store.windowId, tab: snapshot })
        useTabStore.getState().closeTab(tabId)
        useFileStore.getState().showToast('success', t('tabs.detached'), tab.displayName)
        return true
      } catch (error) {
        const described = describeError(error)
        if (described.message.includes('MAX_WINDOWS') || described.detail?.includes('MAX_WINDOWS')) {
          useFileStore
            .getState()
            .showToast('warning', t('tabs.maxWindowsReached'), t('tabs.maxWindowsDetail'))
        } else {
          useFileStore.getState().showToast(described.kind, described.message, described.detail)
        }
        return false
      }
    },
    [t]
  )

  const newWindow = useCallback(async (): Promise<boolean> => {
    try {
      await window.docflow.window.newWindow()
      return true
    } catch (error) {
      const described = describeError(error)
      useFileStore
        .getState()
        .showToast(
          described.message.includes('MAX_WINDOWS') ? 'warning' : described.kind,
          described.message.includes('MAX_WINDOWS') ? t('tabs.maxWindowsReached') : described.message,
          described.message.includes('MAX_WINDOWS') ? t('tabs.maxWindowsDetail') : described.detail
        )
      return false
    }
  }, [t])

  return { detachTab, newWindow }
}
