import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { authUsers } from 'drizzle-orm/supabase'

// RLS on with no policies: blocks the Supabase Data API; Drizzle (table owner) bypasses it.

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}

// Our side of the account: one row per auth.users row, created by the on_auth_user_created trigger.
// Every user_id references profiles.id, so deleting the auth user cascades through all their data.
export const profiles = pgTable('profiles', {
  id: uuid().primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  displayName: text(),
  ...timestamps,
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}).enableRLS()

const userId = () => uuid().notNull().references(() => profiles.id, { onDelete: 'cascade' })

export const conversations = pgTable('conversations', {
  id: uuid().primaryKey().defaultRandom(),
  userId: userId(),
  title: text(),
  ...timestamps,
}).enableRLS()

export const roleEnum = pgEnum('role', ['system', 'user', 'assistant'])

export const messages = pgTable(
  'messages',
  {
    id: text().primaryKey(), // AI SDK UIMessage id
    conversationId: uuid().notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    role: roleEnum().notNull(),
    parts: jsonb().notNull(),
    index: integer().notNull(),
    ...timestamps,
  },
  t => [index('messages_conversation_idx').on(t.conversationId, t.index)],
).enableRLS()

export interface Anchor { quote: string, prefix: string, suffix: string }

export const threadStatus = pgEnum('thread_status', ['open', 'resolved'])

export const threads = pgTable(
  'threads',
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid().notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    anchorMessageId: text().notNull().references(() => messages.id, { onDelete: 'cascade' }),
    anchor: jsonb().$type<Anchor>().notNull(),
    // Main messages with index <= snapshotIndex form the forked context.
    snapshotIndex: integer().notNull(),
    status: threadStatus().default('open').notNull(),
    ...timestamps,
  },
  t => [index('threads_conversation_idx').on(t.conversationId)],
).enableRLS()

export const threadMessages = pgTable(
  'thread_messages',
  {
    id: text().primaryKey(),
    threadId: uuid().notNull().references(() => threads.id, { onDelete: 'cascade' }),
    role: roleEnum().notNull(),
    parts: jsonb().notNull(),
    index: integer().notNull(),
    ...timestamps,
  },
  t => [index('thread_messages_thread_idx').on(t.threadId, t.index)],
).enableRLS()
