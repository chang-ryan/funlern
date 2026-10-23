import { and, eq, lt, lte, sql } from 'drizzle-orm'
import { aiLimitBuckets, dayStart } from '@/lib/ai/limits'
import { db } from '.'
import { aiUsageCounters } from './schema'
import 'server-only'

export interface AiLimit { error: string, retryAfter: number }

/** A refused reservation, for code that has to leave through a throw (e.g. a callback). */
export class AiLimitError extends Error {
  constructor(readonly limit: AiLimit) {
    super(limit.error)
  }
}

/**
 * Reserve `units` before paid work (lib/ai/limits.ts `unitsFor`); null when reserved, else the limit hit. A
 * rejected bucket rolls every increment back, including concurrent requests. Call it before any write the
 * request makes, so a refusal leaves nothing half-done.
 */
export async function reserveAiRequest(userId: string, units = 1): Promise<AiLimit | null> {
  try {
    await db.transaction(async (tx) => {
      const [{ now }] = await tx.select({ now: sql<string>`current_timestamp` }).from(sql`(select 1) as clock`)
      const time = new Date(now)
      for (const bucket of aiLimitBuckets(userId, time, process.env)) {
        const refused = () => new AiLimitError({ error: bucket.message, retryAfter: Math.max(1, Math.ceil((bucket.windowStart.getTime() + bucket.seconds * 1000 - time.getTime()) / 1000)) })
        if (units > bucket.limit)
          throw refused()
        const rows = await tx.insert(aiUsageCounters).values({ scope: bucket.scope, userId: bucket.userId, windowStart: bucket.windowStart, requests: units }).onConflictDoUpdate({
          target: [aiUsageCounters.scope, aiUsageCounters.windowStart],
          set: { requests: sql`${aiUsageCounters.requests} + ${units}` },
          setWhere: lte(aiUsageCounters.requests, bucket.limit - units),
        }).returning({ requests: aiUsageCounters.requests })
        if (!rows.length)
          throw refused()
      }
      // A learner's windows from before today never count again; drop them as they go.
      await tx.delete(aiUsageCounters).where(and(eq(aiUsageCounters.userId, userId), lt(aiUsageCounters.windowStart, dayStart(time))))
    })
    return null
  }
  catch (error) {
    if (error instanceof AiLimitError)
      return error.limit
    throw error // Database failures fail closed; never make an unmetered provider request.
  }
}

export function aiLimitResponse(limit: AiLimit) {
  return Response.json({ error: limit.error }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
}
