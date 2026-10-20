import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getConversations } from '@/lib/db/queries'
import { getUserId } from '@/lib/supabase/server'

export default async function Home() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const conversations = await getConversations(userId)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="font-semibold tracking-tight">funlern</h1>
        <Link href="/new" className="rounded-lg bg-student px-3 py-1.5 text-sm text-student-foreground">New chat</Link>
      </header>
      {conversations.length === 0
        ? <p className="text-sm text-muted">No conversations yet. Start one to begin learning.</p>
        : (
            <ul className="flex flex-col divide-y divide-border">
              {conversations.map(c => (
                <li key={c.id}>
                  <Link href={`/c/${c.id}`} className="block py-3 hover:text-muted">
                    {c.title ?? 'Untitled conversation'}
                    <span className="ml-2 text-xs text-muted">{c.createdAt.toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
    </main>
  )
}
