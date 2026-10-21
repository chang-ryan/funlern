import { redirect } from 'next/navigation'
import { getPlan } from '@/lib/db/plans'
import { getUserId } from '@/lib/supabase/server'
import 'server-only'

/** The signed-in learner, for server actions and pages; sends anyone else to sign in. */
export async function requireUser() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  return userId
}

/** The learner's plan, for server actions; a plan that isn't theirs, or a malformed id, is "Not found". */
export async function requirePlan(planId: string) {
  const userId = await requireUser()
  const plan = await getPlan(userId, planId)
  if (!plan)
    throw new Error('Not found')
  return { userId, plan }
}

/** How every route reports a failure: `{ error }` with a message fit to show the learner. */
export function errorResponse(status: number, error: string) {
  return Response.json({ error }, { status })
}

export const UNAUTHORIZED = () => errorResponse(401, 'Sign in again to continue.')
export const NOT_FOUND = () => errorResponse(404, 'Not found.')
