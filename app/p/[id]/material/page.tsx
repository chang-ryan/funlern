import { UNTITLED_PLAN } from '@/components/plan/format'
import { MaterialList } from '@/components/plan/material-list'
import { PlanFiles } from '@/components/plan/plan-files'
import { PlanShell } from '@/components/plan/plan-shell'
import { loadPlan } from '../load'

/** A plan's material, full page in place of the plan's main column. */
export default async function PlanMaterialPage({ params }: PageProps<'/p/[id]/material'>) {
  const { id } = await params
  const { plan, docs, materials } = await loadPlan(id)

  return (
    <PlanShell back={{ href: `/p/${plan.id}`, label: plan.title ?? UNTITLED_PLAN }} files={<PlanFiles planId={plan.id} docs={docs} materials={materials.length} active="material" />}>
      <MaterialList
        planId={plan.id}
        items={materials.map(m => ({ id: m.id, kind: m.kind, name: m.name, text: m.text, pages: m.pages, tokens: m.tokens, createdAt: m.createdAt }))}
      />
    </PlanShell>
  )
}
