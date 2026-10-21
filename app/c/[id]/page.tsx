import { notFound, redirect } from 'next/navigation'
import { Conversation } from '@/components/conversation'
import { currentModelId } from '@/lib/ai/model'
import { getPlan } from '@/lib/db/plans'
import { getConversation, getMessages, getThreadMessages, getThreads } from '@/lib/db/queries'
import { livesOnPlanPage } from '@/lib/plans/modes'
import { getUserId } from '@/lib/supabase/server'

export default async function ConversationPage({ params }: PageProps<'/c/[id]'>) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const convo = await getConversation(userId, id)
  if (!convo)
    notFound()
  // Mission control always lives on its plan's page.
  if (livesOnPlanPage(convo.mode) && convo.planId)
    redirect(`/p/${convo.planId}/mc`)

  const [messages, threads, plan] = await Promise.all([getMessages(id), getThreads(id), convo.planId ? getPlan(userId, convo.planId) : null])
  const threadsWithMessages = await Promise.all(threads.map(async t => ({ ...t, messages: await getThreadMessages(t.id) })))

  return <Conversation id={id} mode={convo.mode} trainingStyle={convo.trainingStyle} title={convo.title} plan={plan ? { id: plan.id, title: plan.title } : undefined} model={await currentModelId()} initialMessages={messages} initialThreads={threadsWithMessages} />
}
