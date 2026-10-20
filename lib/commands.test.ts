import { describe, expect, it } from 'vitest'
import { commandMatches } from './commands'

const names = (text: string) => commandMatches(text)?.map(c => c.name) ?? null

describe('commandMatches', () => {
  it('lists every command for a bare slash', () => {
    expect(names('/')).toEqual(['quiz-me', 'create-study-guide'])
  })

  it('filters on the label and on the command', () => {
    expect(names('/quiz-me')).toEqual(['quiz-me'])
    expect(names('/Quiz Me')).toEqual(['quiz-me'])
    expect(names('/study')).toEqual(['create-study-guide'])
    expect(names('/QUIZ')).toEqual(['quiz-me'])
  })

  it('stays closed for ordinary text, no matches, and a picked command', () => {
    expect(names('what is a closure?')).toBeNull()
    expect(names('/nope')).toBeNull()
    expect(names('/quiz-me ')).toBeNull()
    expect(names('/quiz-me on closures')).toBeNull()
    expect(names('/quiz\nmore')).toBeNull()
  })
})
