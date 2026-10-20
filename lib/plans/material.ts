// A plan's material: the learner's own files, extracted once to Markdown. Client-safe: limits and copy for the Material page.

export const MATERIAL_KINDS = ['pdf', 'markdown', 'paste'] as const
export type MaterialKind = (typeof MATERIAL_KINDS)[number]

// All of a plan's material goes in the system prompt, so its text is capped small enough to always fit. A PDF
// with no text layer is transcribed by Claude, which reads at most 100 pages in one request.
export const MATERIAL_LIMITS = { files: 5, tokens: 30_000, bytes: 10 * 1024 * 1024, transcribePages: 100 }

/** Rough token count for English prose and code; close enough for a cap. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 3.5)
}

/** Why a new file can't be added, or null. `current` is the plan's material that isn't deleted. */
export function materialRefusal(current: { tokens: number }[], adding: { tokens: number }) {
  if (current.length >= MATERIAL_LIMITS.files)
    return `A plan holds at most ${MATERIAL_LIMITS.files} files. Delete one to add another.`
  const used = current.reduce((n, m) => n + m.tokens, 0)
  if (used + adding.tokens > MATERIAL_LIMITS.tokens)
    return `That's about ${adding.tokens.toLocaleString()} tokens, and the plan has ${(MATERIAL_LIMITS.tokens - used).toLocaleString()} left of ${MATERIAL_LIMITS.tokens.toLocaleString()}. Delete a file or add something shorter.`
  return null
}
