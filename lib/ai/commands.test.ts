import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { parseCommand } from './commands'

const say = (text: string): UIMessage => ({ id: 'u', role: 'user', parts: [{ type: 'text', text }] })

describe('parseCommand', () => {
  it('reads a command we offer and its arguments', () => {
    expect(parseCommand(say('/quiz-me'))).toEqual({ name: 'quiz-me', args: '' })
    expect(parseCommand(say('/quiz-me  closures\nand scope '))).toEqual({ name: 'quiz-me', args: 'closures\nand scope' })
  })

  it('leaves everything else as ordinary text', () => {
    expect(parseCommand(say('/usr/bin is where?'))).toBeNull()
    expect(parseCommand(say('what does /quiz-me do'))).toBeNull()
    expect(parseCommand(say('/quiz-meh'))).toBeNull()
  })
})
