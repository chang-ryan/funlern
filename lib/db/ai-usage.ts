import { lt, sql } from 'drizzle-orm'
import { aiLimitBuckets } from '@/lib/ai/limits'
import { db } from '.'
import { aiUsage } from './schema'
import 'server-only'

class LimitReached extends Error {
  constructor(message: string, readonly retryAfter: number) {
    super(message)
  }
}

/** Reserve before paid work. A rejected bucket rolls every increment back, including concurrent requests. */
export async function reserveAiRequest(userId: string) {
  try {
    await db.transaction(async (tx) => {
      const [{ now }] = await tx.select({ now: sql<string>`current_timestamp` }).from(sql`(select 1) as clock`)
      const time = new Date(now)
      for (const bucket of aiLimitBuckets(userId, time, process.env)) {
        const rows = await tx.insert(aiUsage).values({ scope: bucket.scope, userId: bucket.userId, windowStart: bucket.windowStart, requests: 1 }).onConflictDoUpdate({
          target: [aiUsage.scope, aiUsage.windowStart],
          set: { requests: sql`${aiUsage.requests} + 1` },
          setWhere: lt(aiUsage.requests, bucket.limit),
        }).returning({ requests: aiUsage.requests })
        if (!rows.length) {
          const retryAfter = Math.max(1, Math.ceil((bucket.windowStart.getTime() + bucket.seconds * 1000 - time.getTime()) / 1000))
          throw new LimitReached(bucket.message, retryAfter)
        }
      }
    })
    return null
  }
  catch (error) {
    if (error instanceof LimitReached)
      return { error: error.message, retryAfter: error.retryAfter }
    throw error // Database failures fail closed; never make an unmetered provider request.
  }
}

export function aiLimitResponse(limit: { error: string, retryAfter: number }) {
  return Response.json({ error: limit.error }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
}
