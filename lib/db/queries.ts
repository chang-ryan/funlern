import type { UIMessage } from 'ai'
import type { MessageMetadata } from './schema'
import { and, asc, desc, eq, gte, inArray, isNull, lte, max, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '.'
import { conversations, messages, threadMessages, threads } from './schema'
import 'server-only'

// Main and thread messages share a row shape; a re-save updates content, metadata and position.
const UPSERT = { parts: sql`excluded.parts`, metadata: sql`excluded.metadata`, index: sql`excluded.index` }

function toRows(uiMessages: UIMessage[]) {
  return uiMessages.map((m, index) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
    metadata: (m.metadata as MessageMetadata | undefined) ?? null,
    index,
  }))
}

export async function getConversation(userId: string, id: string) {
  const [row] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1)
  return row ?? null
}

/**
 * A new chat has no row until its first message, so backing out of an empty chat leaves nothing behind.
 * The client picks the id; one that is malformed or belongs to someone else comes back null.
 */
export async function getOrStartConversation(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success)
    return null
  const existing = await getConversation(userId, id)
  if (existing)
    return existing
  await db.insert(conversations).values({ id, userId }).onConflictDoNothing()
  return getConversation(userId, id)
}

/** Sets a generated title unless the conversation already has one (the learner renamed it). True if set. */
export async function setGeneratedTitle(conversationId: string, title: string) {
  const rows = await db.update(conversations).set({ title }).where(and(eq(conversations.id, conversationId), isNull(conversations.title))).returning({ id: conversations.id })
  return rows.length > 0
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

/** Index of main's latest saved message, or -1 when there are none. */
export async function getLatestMessageIndex(conversationId: string) {
  const [row] = await db.select({ index: max(messages.index) }).from(messages).where(eq(messages.conversationId, conversationId))
  return row?.index ?? -1
}

export async function getMessage(conversationId: string, id: string) {
  const [row] = await db.select().from(messages).where(and(eq(messages.conversationId, conversationId), eq(messages.id, id))).limit(1)
  return row ?? null
}

export async function saveMessages(conversationId: string, uiMessages: UIMessage[]) {
  if (!uiMessages.length)
    return
  await db.insert(messages).values(toRows(uiMessages).map(r => ({ ...r, conversationId }))).onConflictDoUpdate({ target: messages.id, set: UPSERT })
}

/** Drops main's messages from `index` on: a retried turn replaces whatever followed it. */
export async function deleteMessagesFrom(conversationId: string, index: number) {
  await db.delete(messages).where(and(eq(messages.conversationId, conversationId), gte(messages.index, index)))
}

/** Thread with ownership check via its conversation. */
export async function getThread(userId: string, id: string) {
  const [row] = await db.select({ thread: threads }).from(threads).innerJoin(conversations, eq(threads.conversationId, conversations.id)).where(and(eq(threads.id, id), eq(conversations.userId, userId))).limit(1)
  return row?.thread ?? null
}

export async function getThreads(conversationId: string) {
  return db.select().from(threads).where(eq(threads.conversationId, conversationId)).orderBy(asc(threads.createdAt))
}

/** Every thread in a conversation with its messages, oldest thread first. */
export async function getThreadsWithMessages(conversationId: string) {
  const ts = await getThreads(conversationId)
  if (!ts.length)
    return []
  const rows = await db.select().from(threadMessages).where(inArray(threadMessages.threadId, ts.map(t => t.id))).orderBy(asc(threadMessages.index))
  return ts.map(t => ({ ...t, messages: rows.filter(r => r.threadId === t.id).map(toUIMessage) }))
}

export async function setFoldedThrough(folds: { threadId: string, count: number }[]) {
  await db.transaction(async (tx) => {
    for (const f of folds)
      await tx.update(threads).set({ foldedThrough: f.count }).where(eq(threads.id, f.threadId))
  })
}

export async function getThreadMessages(threadId: string) {
  const rows = await db.select().from(threadMessages).where(eq(threadMessages.threadId, threadId)).orderBy(asc(threadMessages.index))
  return rows.map(toUIMessage)
}

export async function saveThreadMessages(threadId: string, uiMessages: UIMessage[]) {
  if (!uiMessages.length)
    return
  await db.insert(threadMessages).values(toRows(uiMessages).map(r => ({ ...r, threadId }))).onConflictDoUpdate({ target: threadMessages.id, set: UPSERT })
}

export async function deleteThreadMessagesFrom(threadId: string, index: number) {
  await db.delete(threadMessages).where(and(eq(threadMessages.threadId, threadId), gte(threadMessages.index, index)))
}

function toUIMessage(row: { id: string, role: UIMessage['role'], parts: unknown, metadata: MessageMetadata | null }): UIMessage {
  return { id: row.id, role: row.role, parts: row.parts as UIMessage['parts'], ...(row.metadata && { metadata: row.metadata }) }
}
