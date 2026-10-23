import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DemoVideoLink } from '@/components/demo-video'
import { SessionList } from '@/components/plan/session-list'
import { getPlans, getUncategorized } from '@/lib/db/plans'
import { getDisplayName } from '@/lib/db/profiles'
import { planDescription } from '@/lib/plans/docs'
import { getUserId } from '@/lib/supabase/server'

export default async function Home() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const [name, plans, uncategorized] = await Promise.all([getDisplayName(userId), getPlans(userId), getUncategorized(userId)])
  // A new sign-up gives a name before anything else.
  if (!name)
    redirect('/welcome')

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 overflow-y-auto px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{`Hi, ${name}`}</h1>
        {/* A div, not a p: the link carries its modal, and a dialog can't sit inside a paragraph. */}
        <div className="text-sm text-muted">
          Welcome to funlern, home of the world's first ask-in-side-thread agentic chat. See how it works
          {' '}
          <DemoVideoLink>here</DemoVideoLink>
          .
        </div>
      </header>
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
