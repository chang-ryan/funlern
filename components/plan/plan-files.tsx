import type { PlanDoc } from '@/lib/db/plans'
import type { DocKind } from '@/lib/plans/docs'
import Link from 'next/link'
import { DOC_FILE, DOC_KINDS } from '@/lib/plans/docs'

// training.md is set up in the plan's first training session; material comes with uploads (step 3).
const ACTION = 'rounded-lg border border-border px-2 py-0.5 text-xs hover:bg-border disabled:opacity-50 disabled:hover:bg-transparent'

/** The plan's "project files": its docs, then material. A doc opens full page in place of the plan's left side. */
export function PlanFiles({ planId, docs, active }: { planId: string, docs: PlanDoc[], active?: DocKind }) {
  return (
    <section aria-labelledby="plan-files" className="flex flex-col gap-2">
      <h2 id="plan-files" className="text-sm font-medium text-muted">Files</h2>
      <ul className="flex flex-col rounded-2xl border border-border bg-surface p-1">
        {DOC_KINDS.map((kind) => {
          const doc = docs.find(d => d.kind === kind)
          return (
            <li key={kind}>
              {doc
                ? (
                    <Link
                      href={`/p/${planId}/docs/${kind}`}
                      aria-current={kind === active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${kind === active ? 'bg-border' : 'hover:bg-border/50'}`}
                    >
                      <DocIcon />
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{DOC_FILE[kind]}</span>
                      <span className="text-xs text-muted">{`v${doc.version}`}</span>
                    </Link>
                  )
                : (
                    <FileRow
                      icon={<DocIcon />}
                      label={<span className="font-mono text-[13px]">{DOC_FILE[kind]}</span>}
                      action={kind === 'training' ? <Link href={`/p/${planId}?mode=training`} className={ACTION}>Set up</Link> : undefined}
                    />
                  )}
            </li>
          )
        })}
        <li><FileRow icon={<MaterialIcon />} label="Material" action={<button type="button" disabled title="Uploads are coming soon" className={ACTION}>Add</button>} /></li>
      </ul>
    </section>
  )
}

/** A file the plan doesn't have yet, with the action that adds it. */
function FileRow({ icon, label, action }: { icon: React.ReactNode, label: React.ReactNode, action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted">
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {action}
    </div>
  )
}

function DocIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-[18px] shrink-0 text-muted" aria-hidden>
      <path d="M5.75 2.75h5.5l3.5 3.5v10a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-12.5a1 1 0 0 1 1-1Z" />
      <path d="M11 2.75v3.75h3.75M7.5 10.5h5M7.5 13.5h3.5" />
    </svg>
  )
}

function MaterialIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-[18px] shrink-0" aria-hidden>
      <path d="M13.5 6.5 7.9 12.1a1.5 1.5 0 0 0 2.1 2.1l5.8-5.8a3 3 0 0 0-4.2-4.2L5.8 10a4.5 4.5 0 0 0 6.4 6.4l4.3-4.3" />
    </svg>
  )
}
