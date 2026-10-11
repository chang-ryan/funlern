import type { ModelMessage } from 'ai'
import type { ResolvedModel } from './resolve-model'

/** Marks the end of the shared prefix as a cache breakpoint. Only Anthropic needs it explicitly. */
export function markCacheBreakpoint(messages: ModelMessage[], index: number, provider: ResolvedModel['provider']) {
  if (provider !== 'anthropic' || index < 0 || index >= messages.length)
    return messages
  return messages.map((m, i) => i === index
    ? { ...m, providerOptions: { ...m.providerOptions, anthropic: { cacheControl: { type: 'ephemeral' } } } }
    : m)
}
