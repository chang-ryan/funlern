import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

// A generated conversation title, sent once on the first turn; transient, so it is never saved on a message.
export const TITLE_PART = 'data-title'

export function textOf(m: UIMessage) {
  return m.parts.map(p => (p.type === 'text' ? p.text : '')).join('')
}

/** True when a tutor message has something to show: text, or a card such as a quiz. */
export function hasContent(m: UIMessage) {
  return m.parts.some(p => (p.type === 'text' && p.text.trim()) || isToolUIPart(p))
}

/**
 * True while a reply is on its way but its current step shows no text yet. The model thinks first, and its
 * thinking arrives as reasoning parts with empty text, so "streaming" alone doesn't mean there is anything to
 * show. A reply that continues after a quiz is answered is a new step on the same message.
 */
export function awaitingText(messages: UIMessage[], busy: boolean) {
  const last = messages.at(-1)
  if (!busy || last?.role !== 'assistant')
    return busy
  const step = last.parts.slice(last.parts.findLastIndex(p => p.type === 'step-start') + 1)
  return !step.some(p => p.type === 'text' && p.text.trim())
}
