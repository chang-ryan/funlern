import type { PlanUpdate } from '@/lib/plans/updates'
import { DOC_FILE } from '@/lib/plans/docs'

/** Shows which plan doc and material changes a main turn carried to the tutor. */
export function PlanUpdateNote({ data }: { data: PlanUpdate }) {
  const changes = [
    ...data.docs.map(d => `${DOC_FILE[d.kind]} (${Object.keys(d.sections).join(', ')})`),
    ...(data.materials?.added ?? []).map(m => `${m.name} added`),
    ...(data.materials?.removed ?? []).map(m => `${m.name} removed`),
  ]
  return (
    <p className="max-w-[85%] text-right text-xs text-muted sm:max-w-[75%]">
      {changes.join(' · ')}
      {' · sent to the tutor'}
    </p>
  )
}
