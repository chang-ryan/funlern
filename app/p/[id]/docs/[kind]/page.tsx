import type { DocKind } from '@/lib/plans/docs'
import { notFound } from 'next/navigation'
import { DocEditor } from '@/components/plan/doc-editor'
import { UNTITLED_PLAN } from '@/components/plan/format'
import { PlanFiles } from '@/components/plan/plan-files'
import { PlanShell } from '@/components/plan/plan-shell'
import { getDocVersions } from '@/lib/db/plans'
import { DOC_FILE, DOC_KINDS } from '@/lib/plans/docs'
import { loadPlan } from '../../load'

/** One plan doc, full page in place of the plan's main column, edited section by section. */
export default async function PlanDocPage({ params }: PageProps<'/p/[id]/docs/[kind]'>) {
  const { id, kind: param } = await params
  if (!DOC_KINDS.includes(param as DocKind))
    notFound()
  const kind = param as DocKind
  const { plan, docs } = await loadPlan(id)
  const doc = docs.find(d => d.kind === kind)
  const versions = doc ? await getDocVersions(plan.id, kind) : []

  return (
    <PlanShell back={{ href: `/p/${plan.id}`, label: plan.title ?? UNTITLED_PLAN }} files={<PlanFiles planId={plan.id} docs={docs} active={kind} />}>
      {doc
        ? <DocEditor planId={plan.id} kind={kind} doc={doc} versions={versions} />
        : (
            <>
              <h1 className="font-mono text-xl font-semibold tracking-tight">{DOC_FILE[kind]}</h1>
              <p className="text-sm text-muted">{`This plan has no ${DOC_FILE[kind]} yet.`}</p>
            </>
          )}
    </PlanShell>
  )
}
