import { redirect } from 'next/navigation'
import { Conversation } from '@/components/conversation'
import { currentModelId } from '@/lib/ai/model'
import { getUserId } from '@/lib/supabase/server'

/** A chat that isn't saved yet: its row is created with the first message (see getOrStartConversation). */
export default async function NewConversationPage() {
  if (!await getUserId())
    redirect('/login')
  return <Conversation id={crypto.randomUUID()} isNew title={null} model={await currentModelId()} initialMessages={[]} initialThreads={[]} />
}
