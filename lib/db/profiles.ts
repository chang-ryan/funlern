import { eq } from 'drizzle-orm'
import { db } from '.'
import { profiles } from './schema'
import 'server-only'

export const NAME_MAX = 80

/** What the app calls the learner; null until a new sign-up gives a name on /welcome. */
export async function getDisplayName(userId: string) {
  const [row] = await db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.id, userId)).limit(1)
  return row?.displayName ?? null
}

export async function setDisplayName(userId: string, displayName: string) {
  await db.update(profiles).set({ displayName }).where(eq(profiles.id, userId))
}
