import type { ThreadData } from './types'
import { Thread } from './thread'

// TODO(mocks): position each thread at its anchor's top; push down on overlap; detached threads at bottom.
export function ThreadRail({ threads }: { threads: ThreadData[] }) {
  if (!threads.length)
    return null
  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border lg:block">
      {threads.filter(t => t.status === 'open').map(t => <Thread key={t.id} thread={t} />)}
    </aside>
  )
}
