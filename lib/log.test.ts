import { InvalidToolInputError, TypeValidationError } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('server-only', () => ({}))
const { describeError } = await import('./log')

describe('describeError', () => {
  it('keeps which field broke which rule, never the rejected value', () => {
    const parsed = z.object({ questions: z.array(z.object({ explanation: z.string().max(10) })) }).safeParse({ questions: [{ explanation: 'a private passage from the chat' }] })
    const validation = new TypeValidationError({ value: { questions: [{ explanation: 'a private passage from the chat' }] }, cause: parsed.error })
    const error = new InvalidToolInputError({ toolName: 'create_quiz', toolInput: '{"questions":[{"explanation":"a private passage from the chat"}]}', cause: validation })
    const described = describeError(error)
    expect(described).toMatchObject({ issues: [{ path: 'questions.0.explanation', code: 'too_big' }] })
    expect(JSON.stringify(described)).not.toContain('private passage')
  })
  it('redacts the value from a tool error that arrives as a string, keeping the issues', () => {
    const message = 'AI_InvalidToolInputError: Invalid input for tool create_quiz: AI_TypeValidationError: Type validation failed: Value: {"explanation":"a private passage from the chat"}.\nError message: [{"code":"too_big","maximum":1200,"path":["questions",0,"explanation"],"message":"Too big"}]'
    const [{ message: kept }] = (describeError(message) as { chain: { message: string }[] }).chain
    expect(kept).not.toContain('private passage')
    expect(kept).toContain('Value: [redacted]')
    expect(kept).toContain('"path":["questions",0,"explanation"]')
  })
  it('keeps the message of an ordinary error and its causes', () => {
    const described = describeError(new Error('Failed query', { cause: new Error('connection refused') }))
    expect(described).toEqual({ chain: [{ name: 'Error', message: 'Failed query' }, { name: 'Error', message: 'connection refused' }] })
  })
})
