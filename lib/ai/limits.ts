export const AI_OUTPUT_TOKENS = 4096

function positiveLimit(env: Record<string, string | undefined>, name: string, fallback: number) {
  const value = env[name] === undefined ? fallback : Number(env[name])
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000)
    throw new Error(`${name} must be an integer between 1 and 1000000.`)
  return value
}

/** Fixed UTC windows; shared Postgres counters enforce these across serverless instances. */
export function aiLimitBuckets(userId: string, now: Date, env: Record<string, string | undefined>) {
  const day = new Date(now)
  day.setUTCHours(0, 0, 0, 0)
  const minute = new Date(now)
  minute.setUTCSeconds(0, 0)
  return [
    { scope: 'global:day', userId: null, windowStart: day, limit: positiveLimit(env, 'AI_REQUESTS_GLOBAL_PER_DAY', 1000), seconds: 86400, message: 'The tutor has reached today\'s shared usage limit. Try again tomorrow.' },
    { scope: `user:${userId}:day`, userId, windowStart: day, limit: positiveLimit(env, 'AI_REQUESTS_PER_DAY', 100), seconds: 86400, message: 'You\'ve reached today\'s tutor limit. Try again tomorrow.' },
    { scope: `user:${userId}:minute`, userId, windowStart: minute, limit: positiveLimit(env, 'AI_REQUESTS_PER_MINUTE', 10), seconds: 60, message: 'You\'re sending requests too quickly. Try again in a minute.' },
  ]
}
