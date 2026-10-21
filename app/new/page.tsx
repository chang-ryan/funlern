import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/supabase/server'

/** A new chat: a fresh id at its real address. Nothing is saved until the first message (getOrStartConversation). */
export default async function NewConversationPage() {
  if (!await getUserId())
    redirect('/login')
  redirect(`/c/${crypto.randomUUID()}`)
}
