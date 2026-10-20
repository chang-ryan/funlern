import type { PlanUpdate } from '@/lib/plans/updates'
import { DOC_FILE } from '@/lib/plans/docs'

/** Shows which plan doc changes a main turn carried to the tutor. */
export function PlanUpdateNote({ data }: { data: PlanUpdate }) {
  return (
    <p className="max-w-[85%] text-right text-xs text-muted sm:max-w-[75%]">
      {data.docs.map(d => `${DOC_FILE[d.kind]} (${Object.keys(d.sections).join(', ')})`).join(' · ')}
      {' updated for the tutor'}
    </p>
  )
}
