import { Profiler } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import '../../src/locales'
import { DocumentEditor } from '../../src/components/DocumentEditor'
import { DocumentViewer } from '../../src/components/DocumentViewer'
import { DEFAULT_DOCUMENT_SETTINGS } from '../../src/types/document'

describe('scroll performance (SOLUSI.md)', () => {
  it('renders every line number once and moves the gutter imperatively on scroll', () => {
    const lineCount = 600
    const value = Array.from({ length: lineCount }, (_, index) => `line ${index + 1}`).join('\n')
    const commits: string[] = []

    const view = render(
      <Profiler id="editor" onRender={(_id, phase) => commits.push(phase)}>
        <DocumentEditor
          value={value}
          onChange={() => undefined}
          onCursorChange={() => undefined}
          fontSize="md"
          fontFamily="sans"
        />
      </Profiler>
    )

    const gutter = view.container.querySelector<HTMLDivElement>('.editor-gutter-inner')
    expect(gutter).not.toBeNull()
    expect(view.container.querySelectorAll('.gutter-line')).toHaveLength(lineCount)

    // Ignore the initial mount commit — only scroll-triggered renders matter.
    commits.length = 0

    const textarea = view.getByRole('textbox', { name: /Markdown editor/i })
    scrollTo(textarea, 320)
    expect(gutter!.style.transform).toBe('translateY(-320px)')

    scrollTo(textarea, 0)
    expect(gutter!.style.transform).toMatch(/translateY\(-?0px\)/)

    // Scrolling must not schedule another React render.
    expect(commits).toHaveLength(0)
  })

  it('uses layout zoom variables instead of transform:scale on the preview', () => {
    const onScrollTop = vi.fn()
    const view = render(
      <DocumentViewer
        html="<p>Hello</p>"
        title="Doc"
        settings={DEFAULT_DOCUMENT_SETTINGS}
        zoomLevel={150}
        onScrollTop={onScrollTop}
      />
    )

    const stage = view.container.querySelector<HTMLDivElement>('.preview-stage')
    const page = view.container.querySelector<HTMLElement>('.document-page')
    expect(stage?.style.getPropertyValue('--doc-zoom')).toBe('1.5')
    expect(page?.style.transform).toBe('')

    const pane = view.container.querySelector<HTMLElement>('.preview-pane')!
    scrollTo(pane, 480)
    // Reported synchronously so the parent can keep it in a ref.
    expect(onScrollTop).toHaveBeenCalledWith(480)
  })
})

function scrollTo(element: Element, top: number) {
  Object.defineProperty(element, 'scrollTop', { configurable: true, value: top, writable: true })
  fireEvent.scroll(element)
}
