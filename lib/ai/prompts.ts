import type { Anchor } from '@/lib/db/schema'

// Shared by both routes so the forked prefix stays byte-identical (prompt cache hits).
export const SYSTEM_PROMPT = 'You are a helpful assistant.'

// Thread instructions live in the user turn, not the system prompt, to keep the prefix cached.
export function threadPrompt(anchor: Anchor, question: string) {
  const quote = anchor.quote.split('\n').map(l => `> ${l}`).join('\n')
  return `The user highlighted this passage in your answer:\n${quote}\n\nAnswer briefly, about this passage only.\n\nQuestion: ${question}`
}
