import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '../../src/locales'
import App from '../../src/App'
import { useTabStore } from '../../src/store/tabStore'
import { installDocflowBridge } from '../helpers/docflowBridge'

beforeAll(() => {
  installDocflowBridge()
})

beforeEach(() => {
  useTabStore.setState({
    tabs: [],
    activeTabId: null,
    windowId: null,
    reopenStack: [],
    hydrated: false,
    untitledCounter: 1
  })
})

function scrollElement(element: Element, top: number) {
  Object.defineProperty(element, 'scrollTop', { configurable: true, value: top, writable: true })
  fireEvent.scroll(element)
}

async function nextFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
}

describe('tab scroll persistence (SOLUSI.md #3)', () => {
  it('keeps live offsets in refs and commits them only when switching tabs', async () => {
    render(<App />)

    const editor = await screen.findByRole('textbox', { name: /Markdown editor/i })
    await waitFor(() => expect(useTabStore.getState().hydrated).toBe(true))
    await nextFrame()

    const firstId = useTabStore.getState().activeTabId
    expect(firstId).toBeTruthy()

    // Scroll while the tab is active: nothing should be written to the store.
    scrollElement(editor, 250)
    expect(useTabStore.getState().getTab(firstId!)?.editorScrollTop).toBe(0)

    let secondId = ''
    act(() => {
      const result = useTabStore.getState().newTab('second document', true)
      secondId = result.id ?? ''
    })
    await nextFrame()

    expect(useTabStore.getState().getTab(firstId!)?.editorScrollTop).toBe(250)

    const preview = document.querySelector<HTMLElement>('.preview-pane')
    expect(preview).not.toBeNull()
    scrollElement(preview!, 420)

    act(() => {
      useTabStore.getState().activateTab(firstId!)
    })
    await nextFrame()

    expect(useTabStore.getState().getTab(secondId)?.previewScrollTop).toBe(420)
  })
})
