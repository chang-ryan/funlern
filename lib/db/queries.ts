import type { UIMessage } from 'ai'
import { and, asc, eq, lte, sql } from 'drizzle-orm'
import { db } from '.'
import { conversation, message, thread, threadMessage } from './schema'
import 'server-only'

export async function getConversation(userId: string, id: string) {
  const [row] = await db.select().from(conversation).where(and(eq(conversation.id, id), eq(conversation.userId, userId))).limit(1)
  return row ?? null
}

export async function getMessages(conversationId: string, upToIndex?: number) {
  const rows = await db.select().from(message).where(and(
    eq(message.conversationId, conversationId),
    upToIndex === undefined ? undefined : lte(message.index, upToIndex),
  )).orderBy(asc(message.index))
  return rows.map(toUIMessage)
}

export async function saveMessages(conversationId: string, messages: UIMessage[]) {
  if (!messages.length)
    return
  await db.insert(message).values(messages.map((m, index) => ({
    id: m.id,
    conversationId,
    role: m.role,
    parts: m.parts,
    index,
  }))).onConflictDoUpdate({ target: message.id, set: { parts: sql`excluded.parts`, index: sql`excluded.index` } })
}

/** Thread with ownership check via its conversation. */
export async function getThread(userId: string, id: string) {
  const [row] = await db.select({ thread }).from(thread).innerJoin(conversation, eq(thread.conversationId, conversation.id)).where(and(eq(thread.id, id), eq(conversation.userId, userId))).limit(1)
  return row?.thread ?? null
}

export async function getThreads(conversationId: string) {
  return db.select().from(thread).where(eq(thread.conversationId, conversationId)).orderBy(asc(thread.createdAt))
}

export async function getThreadMessages(threadId: string) {
  const rows = await db.select().from(threadMessage).where(eq(threadMessage.threadId, threadId)).orderBy(asc(threadMessage.index))
  return rows.map(toUIMessage)
}

export async function saveThreadMessages(threadId: string, messages: UIMessage[]) {
  if (!messages.length)
    return
  await db.insert(threadMessage).values(messages.map((m, index) => ({
    id: m.id,
    threadId,
    role: m.role,
    parts: m.parts,
    index,
  }))).onConflictDoUpdate({ target: threadMessage.id, set: { parts: sql`excluded.parts`, index: sql`excluded.index` } })
}

function toUIMessage(row: { id: string, role: UIMessage['role'], parts: unknown }): UIMessage {
  return { id: row.id, role: row.role, parts: row.parts as UIMessage['parts'] }
}
