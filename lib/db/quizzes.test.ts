import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('.', () => ({ db: {} }))

const { shuffleChoices } = await import('./quizzes')

describe('shuffleChoices', () => {
  it('moves the answer index with its choice', () => {
    const q = { question: 'q', choices: ['right', 'b', 'c', 'd'], answer: 0, explanation: '' }
    for (let seed = 0; seed < 20; seed++) {
      const shuffled = shuffleChoices(q, () => ((seed * 7919) % 100) / 100)
      expect(shuffled.choices[shuffled.answer]).toBe('right')
      expect([...shuffled.choices].sort()).toEqual([...q.choices].sort())
    }
  })
})
