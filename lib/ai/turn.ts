import type { UIMessage } from 'ai'
import type { MessageMetadata } from '@/lib/db/schema'

/**
 * Places the learner's message against what is already saved. A message we have seen before is a retry:
 * the turn restarts from it (the saved copy wins, so side questions folded into it stay), and whatever
 * followed it, such as a cut-off reply, is dropped.
 */
export function placeTurn(stored: UIMessage[], incoming: UIMessage) {
  const at = stored.findIndex(m => m.id === incoming.id)
  if (at < 0)
    return { history: stored, message: incoming, retry: false as const }
  if (stored[at].role !== 'user')
    throw new Error('Only a learner message can be retried')
  return { history: stored.slice(0, at), message: stored[at], retry: true as const, dropFrom: at + 1 }
}

// A reply that ends on a tool call (the quiz card) ended normally too.
const COMPLETE = new Set(['stop', 'tool-calls'])

/** Records how the reply ended on the last tutor message. Anything but a normal end shows as cut off. */
export function stampFinish(messages: UIMessage[], finishReason: string | undefined): UIMessage[] {
  const last = messages.at(-1)
  if (last?.role !== 'assistant')
    return messages
  const metadata: MessageMetadata = { ...(last.metadata as MessageMetadata | undefined), finishReason: finishReason ?? 'unknown' }
  return [...messages.slice(0, -1), { ...last, metadata }]
}

/** True when a tutor message was saved without finishing normally. Older messages carry no metadata and count as complete. */
export function wasCutOff(message: UIMessage) {
  const reason = (message.metadata as MessageMetadata | undefined)?.finishReason
  return message.role === 'assistant' && reason !== undefined && !COMPLETE.has(reason)
}

/** What went wrong with the last reply, to show with a Retry button; null when nothing did. */
export function replyProblem(messages: UIMessage[], error?: Error) {
  if (error)
    return error.message || 'Something went wrong.'
  const last = messages.at(-1)
  return last && wasCutOff(last) ? 'This reply was cut off.' : null
}
