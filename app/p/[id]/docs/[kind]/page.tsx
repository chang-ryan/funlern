import type { DocKind } from '@/lib/plans/docs'
import { notFound } from 'next/navigation'
import { TutorMarkdown } from '@/components/chat/tutor-markdown'
import { shortDate, UNTITLED_PLAN } from '@/components/plan/format'
import { PlanFiles } from '@/components/plan/plan-files'
import { PlanShell } from '@/components/plan/plan-shell'
import { DOC_FILE, DOC_KINDS } from '@/lib/plans/docs'
import { loadPlan } from '../../load'

/** One plan doc, full page in place of the plan's main column. Read-only for now. */
export default async function PlanDocPage({ params }: PageProps<'/p/[id]/docs/[kind]'>) {
  const { id, kind } = await params
  if (!DOC_KINDS.includes(kind as DocKind))
    notFound()
  const { plan, docs } = await loadPlan(id)
  const doc = docs.find(d => d.kind === kind)

  return (
    <PlanShell back={{ href: `/p/${plan.id}`, label: plan.title ?? UNTITLED_PLAN }} files={<PlanFiles planId={plan.id} docs={docs} active={kind as DocKind} />}>
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-xl font-semibold tracking-tight">{DOC_FILE[kind as DocKind]}</h1>
        {doc && (
          <p className="text-sm text-muted">
            {`version ${doc.version} · by ${doc.author === 'tutor' ? 'tutor' : 'you'} · ${shortDate(doc.createdAt)}`}
          </p>
        )}
      </header>
      {doc
        ? <TutorMarkdown text={doc.body} className="max-w-3xl text-[15px] leading-relaxed [&_li:has(>input[type=checkbox])]:list-none" />
        : <p className="text-sm text-muted">{`This plan has no ${DOC_FILE[kind as DocKind]} yet.`}</p>}
    </PlanShell>
  )
}
