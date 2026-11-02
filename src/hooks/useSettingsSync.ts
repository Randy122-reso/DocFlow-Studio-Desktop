import { useEffect, useRef } from 'react'
import type { AppSettings } from '../../electron/types/ipc'
import { useFileStore } from '../store/fileStore'
import type { DocumentSettings } from '../types/document'

const DOCUMENT_KEYS: Array<keyof DocumentSettings> = [
  'theme',
  'fontSize',
  'fontFamily',
  'pageSize',
  'marginSize',
  'paperTone',
  'showHeaderFooter',
  'showPageNumbers',
  'autoNumberHeadings',
  'justifyText'
]

function pickDocumentSettings(settings: AppSettings): DocumentSettings {
  const result = {} as DocumentSettings
  for (const key of DOCUMENT_KEYS) {
    // @ts-expect-error dynamic assignment across matching unions
    result[key] = settings[key]
  }
  return result
}

export function useSettingsSync(): void {
  const hydrated = useRef(false)

  useEffect(() => {
    let mounted = true
    void window.docflow.settings
      .all()
      .then((settings) => {
        if (!mounted) return
        useFileStore.getState().setSettings(pickDocumentSettings(settings))
        hydrated.current = true
      })
      .catch(() => {
        hydrated.current = true
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = useFileStore.subscribe((state, previous) => {
      if (state.settings === previous.settings || !hydrated.current) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const current = useFileStore.getState().settings
        void window.docflow.settings.set(current).catch(() => undefined)
      }, 500)
    })
    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
