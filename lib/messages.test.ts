import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { awaitingText, hasContent } from './messages'

const user: UIMessage = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }
const thinking: UIMessage = { id: 'a', role: 'assistant', parts: [{ type: 'step-start' }, { type: 'reasoning', text: '' }] }
const answering: UIMessage = { ...thinking, parts: [...thinking.parts, { type: 'text', text: 'Hello' }] }

describe('awaitingText', () => {
  it('waits from send until the reply has text, through a thinking phase with no text', () => {
    expect(awaitingText([user], true)).toBe(true)
    expect(awaitingText([user, thinking], true)).toBe(true)
    expect(awaitingText([user, answering], true)).toBe(false)
  })

  it('never waits when nothing is in flight', () => {
    expect(awaitingText([user], false)).toBe(false)
  })
})

const quizCard: UIMessage = { id: 'q', role: 'assistant', parts: [{ type: 'step-start' }, { type: 'tool-quiz', toolCallId: 't', state: 'output-available', input: {}, output: {} }] }

describe('after a quiz is answered', () => {
  it('waits for the next step\'s text, while the quiz itself still counts as content', () => {
    expect(awaitingText([user, quizCard], true)).toBe(true)
    expect(awaitingText([user, { ...quizCard, parts: [...quizCard.parts, { type: 'step-start' }, { type: 'text', text: 'Nice' }] }], true)).toBe(false)
    expect(hasContent(quizCard)).toBe(true)
    expect(hasContent(thinking)).toBe(false)
  })
})
