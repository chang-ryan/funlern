import type { UIMessage } from 'ai'
import { COMMANDS } from '@/lib/commands'
import { textOf } from '@/lib/messages'

/** The slash command a learner message starts with, if it is one we offer. Anything else is ordinary text. */
export function parseCommand(message: UIMessage) {
  const text = textOf(message).trim()
  if (!text.startsWith('/'))
    return null
  const space = text.search(/\s/)
  const name = space < 0 ? text.slice(1) : text.slice(1, space)
  const command = COMMANDS.find(c => c.name === name)
  return command ? { name: command.name, args: space < 0 ? '' : text.slice(space).trim() } : null
}
