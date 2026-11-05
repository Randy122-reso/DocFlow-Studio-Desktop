import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_TABS, useTabStore } from '../../src/store/tabStore'
import type { FilePayload, TabSnapshot } from '../../electron/types/ipc'

function payload(path: string, content = `# ${path}`): FilePayload {
  return {
    path,
    name: path.split(/[\\/]/).pop() ?? 'note.md',
    content,
    size: content.length,
    mtime: 1,
    encoding: 'utf-8',
    lineEnding: 'lf'
  }
}

function snapshot(id: string, filePath: string | null = null): TabSnapshot {
  return {
    id,
    filePath,
    displayName: filePath ?? id,
    fileContent: `# ${id}`,
    savedContent: `# ${id}`,
    diskMtime: null,
    encoding: 'utf-8',
    lineEnding: 'lf',
    isPinned: false,
    editorScrollTop: 0,
    previewScrollTop: 0,
    cursorOffset: 0,
    selectionEnd: 0
  }
}

function open(path: string): string {
  const result = useTabStore.getState().openTab(payload(path))
  expect(result.ok).toBe(true)
  return result.id ?? ''
}

beforeEach(() => {
  useTabStore.setState({
    tabs: [],
    activeTabId: null,
    windowId: 'window-1',
    reopenStack: [],
    hydrated: true,
    untitledCounter: 1
  })
})

describe('tabStore', () => {
  it('opens tabs and focuses an existing path instead of duplicating it', () => {
    const first = open('C:\\docs\\a.md')
    const second = open('C:\\docs\\b.md')
    const duplicate = useTabStore.getState().openTab(payload('C:\\docs\\a.md'))

    expect(duplicate).toMatchObject({ ok: true, id: first, reason: 'duplicate' })
    expect(useTabStore.getState().tabs.filter((tab) => tab.filePath === 'C:\\docs\\a.md')).toHaveLength(1)
    expect(useTabStore.getState().activeTabId).toBe(first)
    expect(second).not.toBe(first)
  })

  it('enforces MAX_TABS', () => {
    for (let index = 0; index < MAX_TABS; index += 1) {
      expect(useTabStore.getState().openTab(payload(`C:\\docs\\${index}.md`)).ok).toBe(true)
    }
    expect(useTabStore.getState().tabs).toHaveLength(MAX_TABS)
    expect(useTabStore.getState().openTab(payload('C:\\docs\\overflow.md'))).toEqual({
      ok: false,
      reason: 'max'
    })
  })

  it('moves the active tab to its neighbour when the middle tab closes', () => {
    const first = open('C:\\docs\\a.md')
    const middle = open('C:\\docs\\b.md')
    const last = open('C:\\docs\\c.md')
    useTabStore.getState().activateTab(middle)

    expect(useTabStore.getState().closeTab(middle)).toEqual({ closed: true })
    expect(useTabStore.getState().activeTabId).toBe(last)
    expect(useTabStore.getState().getTab(first)).not.toBeNull()
  })

  it('creates a fresh tab when the last tab closes', () => {
    const id = open('C:\\docs\\only.md')
    useTabStore.getState().activateTab(id)
    useTabStore.getState().closeTab(id)
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].filePath).toBeNull()
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('keeps pinned tabs at the front and blocks dragging across groups', () => {
    const first = open('C:\\docs\\a.md')
    const second = open('C:\\docs\\b.md')
    const third = open('C:\\docs\\c.md')
    useTabStore.getState().togglePin(third)

    expect(useTabStore.getState().tabs[0].id).toBe(third)
    useTabStore.getState().moveTab(third, first)
    expect(useTabStore.getState().tabs[0].id).toBe(third)
    useTabStore.getState().moveTab(first, second)
    expect(useTabStore.getState().tabs.map((tab) => tab.id)).toEqual([third, second, first])

    useTabStore.getState().updateTab(first, { fileContent: 'changed' })
    expect(useTabStore.getState().tabs[0].id).toBe(third)
  })

  it('skips pinned tabs in bulk close operations', () => {
    const first = open('C:\\docs\\a.md')
    const pinned = open('C:\\docs\\b.md')
    const last = open('C:\\docs\\c.md')
    useTabStore.getState().togglePin(pinned)

    useTabStore.getState().closeToRight(first)
    expect(useTabStore.getState().tabs.map((tab) => tab.id).sort()).toEqual([first, pinned].sort())

    useTabStore.getState().closeOthers(first)
    expect(useTabStore.getState().tabs.map((tab) => tab.id).sort()).toEqual([first, pinned].sort())
    expect(useTabStore.getState().getTab(last)).toBeNull()

    useTabStore.getState().closeAll()
    expect(useTabStore.getState().tabs.map((tab) => tab.id)).toEqual([pinned])
  })

  it('round-trips tabs through snapshots', () => {
    const first = open('C:\\docs\\a.md')
    useTabStore.getState().togglePin(first)
    useTabStore.getState().updateTab(first, { editorScrollTop: 42, cursorOffset: 3 })
    const snapshots = useTabStore.getState().toSnapshots()
    expect(snapshots[0]).toMatchObject({ id: first, isPinned: true, editorScrollTop: 42, cursorOffset: 3 })

    useTabStore.getState().hydrate([], null, 'window-2')
    const restored = useTabStore.getState().openSnapshot(snapshots[0])
    expect(restored.ok).toBe(true)
    expect(useTabStore.getState().getTab(restored.id!)?.editorScrollTop).toBe(42)
  })

  it('derives dirty state from buffer and saved content', () => {
    const id = open('C:\\docs\\a.md')
    expect(useTabStore.getState().getTab(id)?.fileContent).toBe(useTabStore.getState().getTab(id)?.savedContent)
    useTabStore.getState().setBuffer(id, 'hello world')
    expect(useTabStore.getState().getTab(id)?.fileContent).not.toBe(useTabStore.getState().getTab(id)?.savedContent)
    useTabStore.getState().markSavedContent(id, 'hello world')
    expect(useTabStore.getState().getTab(id)?.fileContent).toBe(useTabStore.getState().getTab(id)?.savedContent)
  })
})
