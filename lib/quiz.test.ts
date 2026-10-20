import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { activeQuizId, QUIZ_PART, QUIZ_RESULTS, tallyText } from './quiz'

const card = (quizId: string): UIMessage => ({ id: `c-${quizId}`, role: 'assistant', parts: [{ type: QUIZ_PART, toolCallId: quizId, state: 'output-available', input: {}, output: { quizId } }] })
const results = (quizId: string): UIMessage => ({ id: `r-${quizId}`, role: 'user', parts: [{ type: QUIZ_RESULTS, data: { quizId } }] })
const say: UIMessage = { id: 's', role: 'user', parts: [{ type: 'text', text: 'hi' }] }

describe('activeQuizId', () => {
  it('is the latest quiz until its results are sent', () => {
    expect(activeQuizId([say])).toBeNull()
    expect(activeQuizId([say, card('q1')])).toBe('q1')
    expect(activeQuizId([say, card('q1'), results('q1')])).toBeNull()
    expect(activeQuizId([card('q1'), results('q1'), card('q2')])).toBe('q2')
  })
})

describe('tallyText', () => {
  it('counts correct, wrong and skipped, leaving out zeros', () => {
    expect(tallyText([{ picked: 1, answer: 1 }, { picked: 0, answer: 1 }, { picked: null, answer: 2 }, { picked: 3, answer: 3 }])).toBe('2 correct, 1 wrong, 1 skipped')
    expect(tallyText([{ picked: 1, answer: 1 }])).toBe('1 correct')
    expect(tallyText([{ picked: null, answer: 1 }])).toBe('0 correct, 1 skipped')
  })
})
