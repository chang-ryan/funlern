import { loadPlan } from '@/app/p/[id]/load'
import { PlanCrumbs } from '@/components/plan/plan-crumbs'

export default async function PlanMaterialCrumbs({ params }: PageProps<'/p/[id]/material'>) {
  const { plan } = await loadPlan((await params).id)
  return <PlanCrumbs plan={plan}>Material</PlanCrumbs>
}
