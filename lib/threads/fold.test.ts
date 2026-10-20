import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { foldThreads } from './fold'

const msg = (role: UIMessage['role'], text: string): UIMessage => ({ id: `${role}-${text}`, role, parts: [{ type: 'text', text }] })
const thread = (id: string, messages: UIMessage[], foldedThrough = 0) => ({ id, anchor: { quote: `quote ${id}`, prefix: '', suffix: '' }, foldedThrough, messages })

describe('foldThreads', () => {
  it('returns null when no thread has a finished exchange', () => {
    expect(foldThreads([])).toBeNull()
    expect(foldThreads([thread('a', [])])).toBeNull()
    expect(foldThreads([thread('a', [msg('user', 'q1')])])).toBeNull()
  })

  it('folds whole exchanges and leaves an unanswered question for later', () => {
    const fold = foldThreads([thread('a', [msg('user', 'q1'), msg('assistant', 'a1'), msg('user', 'q2')])])
    expect(fold?.data.questions).toEqual([{
      threadId: 'a',
      regarding: 'quote a',
      continued: false,
      messages: [{ role: 'user', text: 'q1' }, { role: 'assistant', text: 'a1' }],
    }])
    expect(fold?.foldedThrough).toEqual([{ threadId: 'a', count: 2 }])
  })

  it('sends only the delta for a thread that was folded before', () => {
    const messages = [msg('user', 'q1'), msg('assistant', 'a1'), msg('user', 'q2'), msg('assistant', 'a2')]
    const fold = foldThreads([thread('a', messages, 2)])
    expect(fold?.data.questions[0]).toMatchObject({ continued: true, messages: [{ text: 'q2' }, { text: 'a2' }] })
    expect(fold?.foldedThrough).toEqual([{ threadId: 'a', count: 4 }])
  })

  it('skips threads with nothing new and keeps thread order', () => {
    const done = thread('a', [msg('user', 'q'), msg('assistant', 'a')], 2)
    const fresh = [thread('b', [msg('user', 'qb'), msg('assistant', 'ab')]), thread('c', [msg('user', 'qc'), msg('assistant', 'ac')])]
    expect(foldThreads([done, ...fresh])?.data.questions.map(q => q.threadId)).toEqual(['b', 'c'])
  })
})
