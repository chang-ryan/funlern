import { notFound, redirect } from 'next/navigation'
import { getActiveMaterials } from '@/lib/db/materials'
import { getPlan, getPlanDocs } from '@/lib/db/plans'
import { getUserId } from '@/lib/supabase/server'
import 'server-only'

/** The learner's plan, its current docs and its material; 404 for anyone else's. Shared by the plan page and its doc views. */
export async function loadPlan(id: string) {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const plan = await getPlan(userId, id)
  if (!plan)
    notFound()
  const [docs, materials] = await Promise.all([getPlanDocs(plan.id), getActiveMaterials(plan.id)])
  return { userId, plan, docs, materials }
}
