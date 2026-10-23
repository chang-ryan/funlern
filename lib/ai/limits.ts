import type { MODELS } from './models'

/** Output cap per tutor model step (chat, threads, quizzes). Long enough for a full study guide. */
export const AI_OUTPUT_TOKENS = 8192
/** Plan drafts write a brief and a syllabus in one structured output. */
export const DRAFT_OUTPUT_TOKENS = 16_384
/** A transcription longer than a plan's whole material budget (~30k tokens) would be refused anyway. */
export const TRANSCRIBE_OUTPUT_TOKENS = 32_768
/** One learner message (main or thread), serialized. About 7k tokens of text: room for a pasted snippet. */
export const MAX_MESSAGE_CHARS = 30_000

// A request counts in units, so the budgets roughly track cost: Sonnet costs about three times Haiku.
const MODEL_UNITS: Record<(typeof MODELS)[number], number> = { 'claude-haiku-5-5': 1, 'claude-sonnet-5-5': 3 }

/** Units one request on this model uses; an unknown model counts as the most expensive. */
export function unitsFor(modelId: string) {
  return MODEL_UNITS[modelId as keyof typeof MODEL_UNITS] ?? Math.max(...Object.values(MODEL_UNITS))
}

function positiveLimit(env: Record<string, string | undefined>, name: string, fallback: number) {
  const value = env[name] === undefined ? fallback : Number(env[name])
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000)
    throw new Error(`${name} must be an integer between 1 and 1000000.`)
  return value
}

/** The UTC day `now` falls in. */
export function dayStart(now: Date) {
  const day = new Date(now)
  day.setUTCHours(0, 0, 0, 0)
  return day
}

/**
 * Fixed UTC windows; shared Postgres counters enforce these across serverless instances. Personal windows come
 * first, so a learner over their own limit never touches (or locks) the shared row. Users in
 * AI_GLOBAL_EXEMPT_USER_IDS (comma-separated) skip the shared day budget, so strangers using it up can't lock
 * the owner out; their personal limits still apply.
 */
export function aiLimitBuckets(userId: string, now: Date, env: Record<string, string | undefined>) {
  const day = dayStart(now)
  const minute = new Date(now)
  minute.setUTCSeconds(0, 0)
  const exempt = (env.AI_GLOBAL_EXEMPT_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).includes(userId)
  return [
    { scope: `user:${userId}:minute`, userId, windowStart: minute, limit: positiveLimit(env, 'AI_REQUESTS_PER_MINUTE', 10), seconds: 60, message: 'You\'re sending requests too quickly. Try again in a minute.' },
    { scope: `user:${userId}:day`, userId, windowStart: day, limit: positiveLimit(env, 'AI_REQUESTS_PER_DAY', 100), seconds: 86400, message: 'You\'ve reached today\'s tutor limit. Try again tomorrow.' },
    ...(exempt ? [] : [{ scope: 'global:day', userId: null, windowStart: day, limit: positiveLimit(env, 'AI_REQUESTS_GLOBAL_PER_DAY', 1000), seconds: 86400, message: 'The tutor has reached today\'s shared usage limit. Try again tomorrow.' }]),
  ]
}
