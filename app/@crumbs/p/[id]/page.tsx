import { loadPlan } from '@/app/p/[id]/load'
import { Breadcrumbs, Crumb } from '@/components/breadcrumbs'
import { UNTITLED_PLAN } from '@/components/plan/format'

export default async function PlanCrumbs({ params }: PageProps<'/p/[id]'>) {
  const { plan } = await loadPlan((await params).id)
  return (
    <Breadcrumbs>
      <Crumb>{plan.title ?? UNTITLED_PLAN}</Crumb>
    </Breadcrumbs>
  )
}
