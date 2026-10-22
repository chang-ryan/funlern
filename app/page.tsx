import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SessionList } from '@/components/plan/session-list'
import { getPlans, getUncategorized } from '@/lib/db/plans'
import { planDescription } from '@/lib/plans/docs'
import { getUserId } from '@/lib/supabase/server'

export default async function Home() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const [plans, uncategorized] = await Promise.all([getPlans(userId), getUncategorized(userId)])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 overflow-y-auto px-4 py-8">
      <section aria-labelledby="plans" className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 id="plans" className="text-sm font-medium text-muted">Plans</h2>
          <Link href="/plans/new" className="rounded-lg bg-student px-3 py-1.5 text-sm text-student-foreground">New plan</Link>
        </header>
        <SessionList
          items={plans.map(p => ({ href: `/p/${p.id}`, title: p.title ?? 'Untitled plan', description: p.brief ? planDescription(p.brief) : undefined, date: p.createdAt }))}
          empty="No plans yet. A plan holds what you want to learn and the sessions that get you there."
        />
      </section>

      <section aria-labelledby="uncategorized" className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 id="uncategorized" className="text-sm font-medium text-muted">Uncategorized</h2>
          <Link href="/new" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-tutor">New chat</Link>
        </header>
        <SessionList
          items={uncategorized.map(c => ({ href: `/c/${c.id}`, title: c.title ?? 'Untitled conversation', date: c.createdAt }))}
          empty="No chats outside a plan."
        />
      </section>
    </main>
  )
}
