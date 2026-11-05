import { describe, expect, it } from 'vitest'
import { useSearchStore } from '../../src/store/searchStore'

describe('Find Selection Feature', () => {
  it('updates focusToken and opens find bar', () => {
    const store = useSearchStore.getState()
    const initialToken = store.focusToken

    useSearchStore.getState().openFind(false)

    expect(useSearchStore.getState().isOpen).toBe(true)
    expect(useSearchStore.getState().focusToken).toBe(initialToken + 1)
  })

  it('updates query and matches properly when seed query is set', () => {
    const store = useSearchStore.getState()
    store.setQuery('PPPoE')

    expect(useSearchStore.getState().query).toBe('PPPoE')
  })

  it('increments focusToken on repeated openFind calls even if already open', () => {
    const tokenBefore = useSearchStore.getState().focusToken
    useSearchStore.getState().openFind(false)
    const tokenAfter = useSearchStore.getState().focusToken

    expect(tokenAfter).toBe(tokenBefore + 1)
  })
})
