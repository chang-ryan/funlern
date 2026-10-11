import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { PROVIDER_IDS } from '../ai/provider-ids'

// userId columns hold auth.users.id (Supabase). No FK across schemas for the POC.
// RLS on with no policies: blocks the Supabase Data API; Drizzle (table owner) bypasses it.

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}

export const modelConfig = pgTable('model_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  label: text('label').notNull(),
  provider: text('provider', { enum: PROVIDER_IDS }).notNull(),
  modelId: text('model_id').notNull(),
  encryptedKey: text('encrypted_key'),
  baseUrl: text('base_url'),
  isDefault: boolean('is_default').default(false).notNull(),
  ...timestamps,
}).enableRLS()

export const conversation = pgTable('conversation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title'),
  modelConfigId: uuid('model_config_id').references(() => modelConfig.id, { onDelete: 'set null' }),
  ...timestamps,
}).enableRLS()

export const roleEnum = pgEnum('role', ['system', 'user', 'assistant'])

export const message = pgTable(
  'message',
  {
    id: text('id').primaryKey(), // AI SDK UIMessage id
    conversationId: uuid('conversation_id').notNull().references(() => conversation.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    parts: jsonb('parts').notNull(),
    index: integer('index').notNull(),
    ...timestamps,
  },
  t => [index('message_conversation_idx').on(t.conversationId, t.index)],
).enableRLS()

export interface Anchor { quote: string, prefix: string, suffix: string }

export const threadStatus = pgEnum('thread_status', ['open', 'resolved'])

export const thread = pgTable(
  'thread',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversation.id, { onDelete: 'cascade' }),
    anchorMessageId: text('anchor_message_id').notNull().references(() => message.id, { onDelete: 'cascade' }),
    anchor: jsonb('anchor').$type<Anchor>().notNull(),
    // Main messages with index <= snapshotIndex form the forked context.
    snapshotIndex: integer('snapshot_index').notNull(),
    status: threadStatus('status').default('open').notNull(),
    ...timestamps,
  },
  t => [index('thread_conversation_idx').on(t.conversationId)],
).enableRLS()

export const threadMessage = pgTable(
  'thread_message',
  {
    id: text('id').primaryKey(),
    threadId: uuid('thread_id').notNull().references(() => thread.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    parts: jsonb('parts').notNull(),
    index: integer('index').notNull(),
    ...timestamps,
  },
  t => [index('thread_message_thread_idx').on(t.threadId, t.index)],
).enableRLS()
