import { redirect } from 'next/navigation'
import { ConversationCrumbs } from '@/components/conversation-crumbs'
import { getPlan } from '@/lib/db/plans'
import { getConversation } from '@/lib/db/queries'
import { getUserId } from '@/lib/supabase/server'

/** A session's plan and title; nothing found means a new session, untitled until its first reply. */
export default async function ConversationCrumbsPage({ params }: PageProps<'/c/[id]'>) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const convo = await getConversation(userId, id)
  const plan = convo?.planId ? await getPlan(userId, convo.planId) : null
  return (
    <ConversationCrumbs
      // A new id is a new session: nothing carries over from the last one's crumbs.
      key={id}
      id={id}
      loaded={{ title: convo?.title ?? null, saved: !!convo }}
      plan={plan ? { id: plan.id, title: plan.title } : undefined}
    />
  )
}
