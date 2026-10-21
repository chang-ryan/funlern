'use server'

import type { Anchor } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getConversation, getLatestMessageIndex, getMessage } from '@/lib/db/queries'
import { answerQuestion, getLearnerQuiz } from '@/lib/db/quizzes'
import { conversations, threads } from '@/lib/db/schema'

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
  const [row] = await db.insert(threads).values({ ...input, snapshotIndex }).returning()
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
