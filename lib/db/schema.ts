import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
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
    metadata: jsonb().$type<MessageMetadata>(),
    index: integer().notNull(),
    ...timestamps,
  },
  t => [index('messages_conversation_idx').on(t.conversationId, t.index)],
).enableRLS()

export interface Anchor { quote: string, prefix: string, suffix: string }

/** Stored on tutor messages. `finishReason` other than 'stop' means the reply was cut off (length, error, dropped stream). */
export interface MessageMetadata { finishReason?: string }

export const threads = pgTable(
  'threads',
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid().notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    anchorMessageId: text().notNull().references(() => messages.id, { onDelete: 'cascade' }),
    anchor: jsonb().$type<Anchor>().notNull(),
    // Main's latest message index when the thread opened; messages up to it form the frozen fork.
    snapshotIndex: integer().notNull(),
    // How many of this thread's messages have been folded into main as side questions.
    foldedThrough: integer().default(0).notNull(),
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
    metadata: jsonb().$type<MessageMetadata>(),
    index: integer().notNull(),
    ...timestamps,
  },
  t => [index('thread_messages_thread_idx').on(t.threadId, t.index)],
).enableRLS()

// Quizzes the tutor writes on /quiz-me. Answers are graded and saved here, so the history of what the
// learner took survives, and the correct answers never reach the browser before the learner picks.
export const quizStatusEnum = pgEnum('quiz_status', ['active', 'completed', 'exited'])

export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: userId(),
    conversationId: uuid().notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    // Active blocks the chat until the learner finishes the quiz or exits it.
    status: quizStatusEnum().default('active').notNull(),
    endedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  t => [index('quizzes_conversation_idx').on(t.conversationId)],
).enableRLS()

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid().primaryKey().defaultRandom(),
    quizId: uuid().notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    question: text().notNull(),
    choices: jsonb().$type<string[]>().notNull(),
    answer: integer().notNull(),
    explanation: text().notNull(),
  },
  t => [unique('quiz_questions_quiz_position_key').on(t.quizId, t.position)],
).enableRLS()

// One answer per question for now; retakes would be a new quiz.
export const quizAnswers = pgTable('quiz_answers', {
  id: uuid().primaryKey().defaultRandom(),
  questionId: uuid().notNull().unique().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  choice: integer().notNull(),
  correct: boolean().notNull(),
  ...timestamps,
}).enableRLS()
