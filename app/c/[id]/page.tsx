import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { Session } from '@/components/session'
import { currentModelId } from '@/lib/ai/model'
import { getConversation, getMessages, getThreadMessages, getThreads } from '@/lib/db/queries'
import { livesOnPlanPage } from '@/lib/plans/modes'
import { getUserId } from '@/lib/supabase/server'

export default async function ConversationPage({ params }: PageProps<'/c/[id]'>) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const convo = await getConversation(userId, id)
  // Not saved yet: a new session at its real address, created by its first message. Starting sessions here,
  // rather than rewriting the URL later, keeps every link, Back and Forward a real navigation.
  if (!convo) {
    if (!z.uuid().safeParse(id).success)
      notFound()
    return <Session id={id} model={await currentModelId()} saved={null} />
  }
  // Mission control always lives on its plan's page.
  if (livesOnPlanPage(convo.mode) && convo.planId)
    redirect(`/p/${convo.planId}/mc`)

  const [messages, threads] = await Promise.all([getMessages(id), getThreads(id)])
  const threadsWithMessages = await Promise.all(threads.map(async t => ({ ...t, messages: await getThreadMessages(t.id) })))

  const saved = { mode: convo.mode, trainingStyle: convo.trainingStyle, messages, threads: threadsWithMessages }
  return <Session id={id} model={await currentModelId()} saved={saved} />
}
