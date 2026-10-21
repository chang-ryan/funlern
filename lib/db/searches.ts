import { and, count, eq, gte } from 'drizzle-orm'
import { db } from '.'
import { webSearches } from './schema'
import 'server-only'

/** How many searches the learner has run in the last 24 hours. */
export async function searchesToday(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [row] = await db.select({ n: count() }).from(webSearches).where(and(eq(webSearches.userId, userId), gte(webSearches.createdAt, since)))
  return row.n
}

export async function recordSearch(input: { userId: string, conversationId: string, query: string, results: number }) {
  await db.insert(webSearches).values(input)
}
