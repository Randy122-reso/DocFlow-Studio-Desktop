import { vi } from 'vitest'

export const unsubscribe = vi.fn()

/**
 * Minimal Electron preload bridge for renderer tests. Mirrors the surface
 * used by App and its hooks; individual tests can override vi.fn()s.
 */
export function installDocflowBridge(): void {
  ;(globalThis.window as unknown as { docflow: unknown }).docflow = {
    app: {
      version: vi.fn(() => Promise.resolve('1.6.2')),
      platform: vi.fn(() => Promise.resolve('win32')),
      consumeLaunchFile: vi.fn(() => Promise.resolve(null)),
      openExternal: vi.fn(() => Promise.resolve({ ok: true })),
      showItemInFolder: vi.fn(() => Promise.resolve({ ok: true })),
      quit: vi.fn(() => Promise.resolve({ ok: true })),
      showContextMenu: vi.fn(() => Promise.resolve({ ok: true })),
      onAction: vi.fn(() => unsubscribe),
      onOpenFile: vi.fn(() => unsubscribe),
      onReady: vi.fn(() => unsubscribe),
      onTabAction: vi.fn(() => unsubscribe)
    },
    file: {
      openDialog: vi.fn(() => Promise.resolve({ cancelled: true })),
      openPath: vi.fn(() => Promise.resolve({ cancelled: true })),
      read: vi.fn(() => Promise.resolve({ cancelled: true })),
      save: vi.fn(),
      saveAs: vi.fn(),
      saveDialog: vi.fn(),
      pickDirectory: vi.fn(),
      info: vi.fn(),
      exists: vi.fn(),
      readBinary: vi.fn(),
      writeBinary: vi.fn(),
      watch: vi.fn(() => Promise.resolve({ watching: true, path: '' })),
      unwatch: vi.fn(() => Promise.resolve({ watching: false, path: '' })),
      getPathForFile: vi.fn(() => ''),
      onExternalChange: vi.fn(() => unsubscribe)
    },
    recent: {
      list: vi.fn(() => Promise.resolve([])),
      add: vi.fn(() => Promise.resolve([])),
      remove: vi.fn(() => Promise.resolve([])),
      clear: vi.fn(() => Promise.resolve([])),
      pin: vi.fn(() => Promise.resolve([])),
      onChanged: vi.fn(() => unsubscribe)
    },
    settings: {
      all: vi.fn(() => Promise.resolve({})),
      get: vi.fn(),
      set: vi.fn(() => Promise.resolve({ ok: true })),
      reset: vi.fn(),
      onChanged: vi.fn(() => unsubscribe)
    },
    session: {
      save: vi.fn(() => Promise.resolve({ ok: true })),
      load: vi.fn(() => Promise.resolve(null)),
      clear: vi.fn()
    },
    window: {
      setDirty: vi.fn(() => Promise.resolve({ ok: true })),
      setTitle: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      isMaximized: vi.fn(),
      close: vi.fn(),
      closeConfirmed: vi.fn(),
      state: vi.fn(),
      info: vi.fn(() =>
        Promise.resolve({
          id: 'win-test',
          bounds: { width: 1200, height: 800, x: null, y: null },
          initialTabs: [],
          activeTabId: null
        })
      ),
      count: vi.fn(() => Promise.resolve(1)),
      newWindow: vi.fn(),
      detachTab: vi.fn(),
      onBoundsChanged: vi.fn(() => unsubscribe)
    },
    dialog: {
      confirmUnsaved: vi.fn(),
      message: vi.fn()
    },
    find: {
      inFiles: vi.fn(),
      replaceInFiles: vi.fn(),
      cancel: vi.fn()
    },
    update: {
      status: vi.fn(() =>
        Promise.resolve({ status: 'idle', availableVersion: null, currentVersion: '1.6.2', error: null })
      ),
      check: vi.fn(() =>
        Promise.resolve({ status: 'idle', availableVersion: null, currentVersion: '1.6.2', error: null })
      ),
      download: vi.fn(() =>
        Promise.resolve({ status: 'idle', availableVersion: null, currentVersion: '1.6.2', error: null })
      ),
      install: vi.fn(),
      cancel: vi.fn(() =>
        Promise.resolve({ status: 'idle', availableVersion: null, currentVersion: '1.6.2', error: null })
      ),
      onStatus: vi.fn(() => unsubscribe)
    },
    i18n: {
      getLocale: vi.fn(() => Promise.resolve({ preference: 'en', locale: 'en' })),
      setLocale: vi.fn(() => Promise.resolve({ preference: 'en', locale: 'en' })),
      onChanged: vi.fn(() => unsubscribe)
    },
    tray: {
      show: vi.fn(),
      hide: vi.fn(),
      setTooltip: vi.fn()
    }
  }
}
