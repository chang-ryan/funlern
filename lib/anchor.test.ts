// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { anchorFromRange, locateAnchor, rangeFromAnchor } from './anchor'

describe('locateAnchor', () => {
  it('picks the occurrence whose context matches', () => {
    const text = 'state goes in. Later, state comes out.'
    expect(locateAnchor(text, { quote: 'state', prefix: 'Later, ', suffix: ' comes' })).toBe(22)
    expect(locateAnchor(text, { quote: 'state', prefix: '', suffix: ' goes' })).toBe(0)
  })

  it('returns -1 when the quote is gone', () => {
    expect(locateAnchor('nothing here', { quote: 'state', prefix: '', suffix: '' })).toBe(-1)
  })
})

describe('anchor round trip', () => {
  it('recovers a selection that spans formatted text', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>React keeps <strong>state</strong> in components.</p><p>Change state, and React re-renders.</p>'
    document.body.append(root)

    // Select "state</strong> in comp" across the bold boundary.
    const strong = root.querySelector('strong')!.firstChild!
    const after = strong.parentNode!.nextSibling!
    const selection = document.createRange()
    selection.setStart(strong, 0)
    selection.setEnd(after, ' in comp'.length)

    const anchor = anchorFromRange(root, selection)!
    expect(anchor.quote).toBe('state in comp')
    expect(anchor.prefix).toBe('React keeps ')

    expect(rangeFromAnchor(root, anchor)!.toString()).toBe('state in comp')
  })

  it('trims whitespace from the edges of a selection', () => {
    const root = document.createElement('div')
    root.textContent = 'one two three'
    const r = document.createRange()
    r.setStart(root.firstChild!, 3)
    r.setEnd(root.firstChild!, 8)
    expect(anchorFromRange(root, r)).toEqual({ quote: 'two', prefix: 'one ', suffix: ' three' })
  })
})
