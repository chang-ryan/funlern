'use server'

import type { Anchor } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getConversation, getThread } from '@/lib/db/queries'
import { conversations, threads } from '@/lib/db/schema'
import { getUserId } from '@/lib/supabase/server'

async function requireUser() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  return userId
}

export async function createConversation() {
  const userId = await requireUser()
  const [row] = await db.insert(conversations).values({ userId }).returning({ id: conversations.id })
  redirect(`/c/${row.id}`)
}

export async function createThread(input: { conversationId: string, anchorMessageId: string, anchor: Anchor, snapshotIndex: number }) {
  const userId = await requireUser()
  if (!await getConversation(userId, input.conversationId))
    throw new Error('Not found')
  const [row] = await db.insert(threads).values(input).returning()
  return row
}

export async function setThreadStatus(id: string, status: 'open' | 'resolved') {
  const userId = await requireUser()
  if (!await getThread(userId, id))
    throw new Error('Not found')
  await db.update(threads).set({ status }).where(eq(threads.id, id))
}
