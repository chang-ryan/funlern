import { notFound, redirect } from 'next/navigation'
import { getPlan, getPlanDocs } from '@/lib/db/plans'
import { getUserId } from '@/lib/supabase/server'
import 'server-only'

/** The learner's plan and its current docs; 404 for anyone else's. Shared by the plan page and its doc views. */
export async function loadPlan(id: string) {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const plan = await getPlan(userId, id)
  if (!plan)
    notFound()
  return { userId, plan, docs: await getPlanDocs(plan.id) }
}
