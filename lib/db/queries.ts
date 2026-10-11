import type { UIMessage } from 'ai'
import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import { db } from '.'
import { conversations, messages, threadMessages, threads } from './schema'
import 'server-only'

export async function getConversation(userId: string, id: string) {
  const [row] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1)
  return row ?? null
}

export async function getConversations(userId: string) {
  return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt))
}

export async function getMessages(conversationId: string, upToIndex?: number) {
  const rows = await db.select().from(messages).where(and(
    eq(messages.conversationId, conversationId),
    upToIndex === undefined ? undefined : lte(messages.index, upToIndex),
  )).orderBy(asc(messages.index))
  return rows.map(toUIMessage)
}

export async function saveMessages(conversationId: string, uiMessages: UIMessage[]) {
  if (!uiMessages.length)
    return
  await db.insert(messages).values(uiMessages.map((m, index) => ({
    id: m.id,
    conversationId,
    role: m.role,
    parts: m.parts,
    index,
  }))).onConflictDoUpdate({ target: messages.id, set: { parts: sql`excluded.parts`, index: sql`excluded.index` } })
}

/** Thread with ownership check via its conversation. */
export async function getThread(userId: string, id: string) {
  const [row] = await db.select({ thread: threads }).from(threads).innerJoin(conversations, eq(threads.conversationId, conversations.id)).where(and(eq(threads.id, id), eq(conversations.userId, userId))).limit(1)
  return row?.thread ?? null
}

export async function getThreads(conversationId: string) {
  return db.select().from(threads).where(eq(threads.conversationId, conversationId)).orderBy(asc(threads.createdAt))
}

export async function getThreadMessages(threadId: string) {
  const rows = await db.select().from(threadMessages).where(eq(threadMessages.threadId, threadId)).orderBy(asc(threadMessages.index))
  return rows.map(toUIMessage)
}

export async function saveThreadMessages(threadId: string, uiMessages: UIMessage[]) {
  if (!uiMessages.length)
    return
  await db.insert(threadMessages).values(uiMessages.map((m, index) => ({
    id: m.id,
    threadId,
    role: m.role,
    parts: m.parts,
    index,
  }))).onConflictDoUpdate({ target: threadMessages.id, set: { parts: sql`excluded.parts`, index: sql`excluded.index` } })
}

function toUIMessage(row: { id: string, role: UIMessage['role'], parts: unknown }): UIMessage {
  return { id: row.id, role: row.role, parts: row.parts as UIMessage['parts'] }
}
