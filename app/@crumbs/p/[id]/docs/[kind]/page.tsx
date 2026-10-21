import type { DocKind } from '@/lib/plans/docs'
import { loadPlan } from '@/app/p/[id]/load'
import { PlanCrumbs } from '@/components/plan/plan-crumbs'
import { DOC_FILE, DOC_KINDS } from '@/lib/plans/docs'

export default async function PlanDocCrumbs({ params }: PageProps<'/p/[id]/docs/[kind]'>) {
  const { id, kind } = await params
  const { plan } = await loadPlan(id)
  return (
    <PlanCrumbs plan={plan}>
      <span className="font-mono">{DOC_KINDS.includes(kind as DocKind) ? DOC_FILE[kind as DocKind] : kind}</span>
    </PlanCrumbs>
  )
}
