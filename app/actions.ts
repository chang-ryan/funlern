'use server'

import type { Anchor } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { encrypt } from '@/lib/crypto'
import { db } from '@/lib/db'
import { getConversation, getThread } from '@/lib/db/queries'
import { conversation, modelConfig, thread } from '@/lib/db/schema'
import { getUserId } from '@/lib/supabase/server'

async function requireUser() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  return userId
}

export async function createConversation() {
  const userId = await requireUser()
  const [row] = await db.insert(conversation).values({ userId }).returning({ id: conversation.id })
  redirect(`/c/${row.id}`)
}

export async function createThread(input: { conversationId: string, anchorMessageId: string, anchor: Anchor, snapshotIndex: number }) {
  const userId = await requireUser()
  if (!await getConversation(userId, input.conversationId))
    throw new Error('Not found')
  const [row] = await db.insert(thread).values(input).returning()
  return row
}

export async function setThreadStatus(id: string, status: 'open' | 'resolved') {
  const userId = await requireUser()
  if (!await getThread(userId, id))
    throw new Error('Not found')
  await db.update(thread).set({ status }).where(eq(thread.id, id))
}

export async function saveModelConfig(input: {
  label: string
  provider: (typeof modelConfig.$inferInsert)['provider']
  modelId: string
  apiKey?: string
  baseUrl?: string
  isDefault?: boolean
}) {
  const userId = await requireUser()
  await db.transaction(async (tx) => {
    if (input.isDefault)
      await tx.update(modelConfig).set({ isDefault: false }).where(and(eq(modelConfig.userId, userId), eq(modelConfig.isDefault, true)))
    await tx.insert(modelConfig).values({
      userId,
      label: input.label,
      provider: input.provider,
      modelId: input.modelId,
      encryptedKey: input.apiKey ? encrypt(input.apiKey) : null,
      baseUrl: input.baseUrl || null,
      isDefault: input.isDefault ?? false,
    })
  })
}
