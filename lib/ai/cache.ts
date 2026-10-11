import type { ModelMessage } from 'ai'

/** Marks the end of the shared prefix as an Anthropic cache breakpoint. */
export function markCacheBreakpoint(messages: ModelMessage[], index: number) {
  if (index < 0 || index >= messages.length)
    return messages
  return messages.map((m, i) => i === index
    ? { ...m, providerOptions: { ...m.providerOptions, anthropic: { cacheControl: { type: 'ephemeral' } } } }
    : m)
}
