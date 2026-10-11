import type { Anchor } from '@/lib/db/schema'

// Per-turn additions ride in the user message, never the system prompt, so the cached prefix stays intact.

/** Frames the first question of a side thread with the passage it quotes. */
export function threadFrame(anchor: Anchor, question: string) {
  const quote = anchor.quote.split('\n').map(l => `> ${l}`).join('\n')
  return `The user highlighted this passage in your answer:\n${quote}\n\nAnswer briefly, about this passage only.\n\nQuestion: ${question}`
}
