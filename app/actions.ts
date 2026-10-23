'use server'

import type { Anchor } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getConversation, getLatestMessageIndex, getMessage } from '@/lib/db/queries'
import { answerQuestion, getLearnerQuiz } from '@/lib/db/quizzes'
import { conversations, threads } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'

// A quote from one tutor message, with the few characters either side that lib/anchor.ts keeps.
const anchorSchema = z.object({ quote: z.string().min(1).max(50_000), prefix: z.string().max(100), suffix: z.string().max(100) })

/** Signs out of this browser and goes to the sign-in page. */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}

/** Renames a conversation; an empty title clears it. */
export async function renameConversation(id: string, title: string | null) {
  const userId = await requireUser()
  const value = title?.trim().slice(0, 200) || null
  await db.update(conversations).set({ title: value }).where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
}

/** Opens a thread on a passage of a tutor message, forking main as it stands now. */
export async function createThread(input: { conversationId: string, anchorMessageId: string, anchor: Anchor }) {
  const userId = await requireUser()
  if (!await getConversation(userId, input.conversationId))
    throw new Error('Not found')
  const anchorMessage = await getMessage(input.conversationId, input.anchorMessageId)
  if (anchorMessage?.role !== 'assistant')
    throw new Error('Threads anchor on tutor messages only')
  const snapshotIndex = await getLatestMessageIndex(input.conversationId)
  // Only these fields: a server action takes whatever the caller sends, whatever its type says.
  const anchor = anchorSchema.parse(input.anchor)
  const [row] = await db.insert(threads).values({ conversationId: input.conversationId, anchorMessageId: input.anchorMessageId, anchor, snapshotIndex }).returning()
  return row
}

/** The quiz card's view of a quiz: answers only for questions already answered, or once it has ended. */
export async function getQuiz(quizId: string) {
  return getLearnerQuiz(await requireUser(), quizId)
}

/** Grades one pick on the server and saves it; returns the correct answer and explanation to show. */
export async function answerQuiz(questionId: string, choice: number) {
  const result = await answerQuestion(await requireUser(), questionId, choice)
  if (!result)
    throw new Error('That question can\'t be answered.')
  return result
}
