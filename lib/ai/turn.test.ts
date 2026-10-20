import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { placeTurn, stampFinish, wasCutOff } from './turn'

const msg = (id: string, role: UIMessage['role'], metadata?: object): UIMessage => ({ id, role, parts: [{ type: 'text', text: id }], ...(metadata && { metadata }) })

describe('placeTurn', () => {
  const stored = [msg('u1', 'user'), msg('a1', 'assistant'), msg('u2', 'user'), msg('a2', 'assistant')]

  it('appends a new message', () => {
    const turn = placeTurn(stored, msg('u3', 'user'))
    expect(turn.retry).toBe(false)
    expect(turn.history).toBe(stored)
  })

  it('restarts a retried message from its saved copy and drops what followed', () => {
    const resent = { ...msg('u2', 'user'), parts: [] }
    const turn = placeTurn(stored, resent)
    expect(turn).toMatchObject({ retry: true, dropFrom: 3, message: stored[2] })
    expect(turn.history.map(m => m.id)).toEqual(['u1', 'a1'])
  })

  it('refuses to retry a tutor message', () => {
    expect(() => placeTurn(stored, msg('a1', 'user'))).toThrow()
  })
})

describe('stampFinish / wasCutOff', () => {
  it('stamps the last tutor message', () => {
    const [, a] = stampFinish([msg('u', 'user'), msg('a', 'assistant')], 'length')
    expect(a.metadata).toEqual({ finishReason: 'length' })
    expect(wasCutOff(a)).toBe(true)
  })

  it('treats a missing finish as cut off and a normal stop as complete', () => {
    expect(wasCutOff(stampFinish([msg('a', 'assistant')], undefined)[0])).toBe(true)
    expect(wasCutOff(stampFinish([msg('a', 'assistant')], 'stop')[0])).toBe(false)
  })

  it('leaves messages without metadata, and learner messages, alone', () => {
    expect(wasCutOff(msg('a', 'assistant'))).toBe(false)
    const ms = [msg('u', 'user')]
    expect(stampFinish(ms, 'stop')).toBe(ms)
  })
})

it('a reply that stops for a quiz is not cut off', () => {
  expect(wasCutOff(msg('a', 'assistant', { finishReason: 'tool-calls' }))).toBe(false)
})
