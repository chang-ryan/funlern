import { loadPlan } from '@/app/p/[id]/load'
import { PlanCrumbs } from '@/components/plan/plan-crumbs'
import { MISSION_TITLE } from '@/lib/plans/modes'

export default async function MissionControlCrumbs({ params }: PageProps<'/p/[id]/mc'>) {
  const { plan } = await loadPlan((await params).id)
  return <PlanCrumbs plan={plan}>{MISSION_TITLE}</PlanCrumbs>
}
