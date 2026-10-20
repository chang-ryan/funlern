import type { PlanDoc } from '@/lib/db/plans'
import Link from 'next/link'
import { DOC_FILE, parseDoc, planDescription } from '@/lib/plans/docs'

/** What mission control shows before its first message: what the plan holds now, and how to change it. */
export function MissionIntro({ planId, docs, materials }: { planId: string, docs: PlanDoc[], materials: number }) {
  const brief = docs.find(d => d.kind === 'brief')
  const syllabus = docs.find(d => d.kind === 'syllabus')
  const training = docs.find(d => d.kind === 'training')
  const units = syllabus ? (parseDoc('syllabus', syllabus.body).Units ?? '').split('\n').filter(l => /^\s*- \[[ x]\]/i.test(l)).length : 0

  const rows: { href: string, name: string, says: string }[] = [
    { href: `/p/${planId}/docs/brief`, name: DOC_FILE.brief, says: brief ? planDescription(brief.body) || 'No goal yet.' : 'Not written yet.' },
    { href: `/p/${planId}/docs/syllabus`, name: DOC_FILE.syllabus, says: syllabus ? `${units} unit${units === 1 ? '' : 's'}` : 'Not written yet.' },
    { href: `/p/${planId}/docs/training`, name: DOC_FILE.training, says: training ? 'Method and Rubric set up' : 'Not set up: only needed for practice reps' },
    { href: `/p/${planId}/material`, name: 'Material', says: materials ? `${materials} file${materials === 1 ? '' : 's'}` : 'None yet' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Mission control</h1>
        <p className="text-sm leading-relaxed text-muted">
          One ongoing conversation for shaping this plan. Your study happens in learning and training sessions; here you adjust what they work from. Here&apos;s what the plan holds now:
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map(r => (
          <li key={r.name}>
            <Link href={r.href} className="flex items-baseline gap-4 px-4 py-3 text-sm hover:bg-border/40">
              <span className="w-28 shrink-0 font-mono text-[13px]">{r.name}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{r.says}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Tell mission control what to change, or start with one of these:</p>
    </div>
  )
}
