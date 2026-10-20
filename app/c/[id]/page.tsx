import { notFound, redirect } from 'next/navigation'
import { Conversation } from '@/components/conversation'
import { currentModelId } from '@/lib/ai/model'
import { getConversation, getMessages, getThreadMessages, getThreads } from '@/lib/db/queries'
import { getUserId } from '@/lib/supabase/server'

export default async function ConversationPage({ params }: PageProps<'/c/[id]'>) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  const convo = await getConversation(userId, id)
  if (!convo)
    notFound()

  const [messages, threads] = await Promise.all([getMessages(id), getThreads(id)])
  const threadsWithMessages = await Promise.all(threads.map(async t => ({ ...t, messages: await getThreadMessages(t.id) })))

  return <Conversation id={id} title={convo.title} model={await currentModelId()} initialMessages={messages} initialThreads={threadsWithMessages} />
}
