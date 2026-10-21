import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import type { DocKind } from '@/lib/plans/docs'
import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { authUsers } from 'drizzle-orm/supabase'
import { DOC_KINDS } from '@/lib/plans/docs'
import { MATERIAL_KINDS } from '@/lib/plans/material'
import { SESSION_MODES, TRAINING_STYLES } from '@/lib/plans/modes'

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

// A plan holds a learner's sessions on one subject, plus the docs the tutor reads (brief, syllabus, training).
export const plans = pgTable(
  'plans',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: userId(),
    title: text(),
    ...timestamps,
  },
  t => [index('plans_user_idx').on(t.userId)],
).enableRLS()

export const sessionModeEnum = pgEnum('session_mode', SESSION_MODES)
export const trainingStyleEnum = pgEnum('training_style', TRAINING_STYLES)

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: userId(),
    // Null: Uncategorized. Deleting a plan moves its sessions there.
    planId: uuid().references((): AnyPgColumn => plans.id, { onDelete: 'set null' }),
    title: text(),
    // Fixed when the session starts. A training session in a plan without training.md sets it up instead.
    mode: sessionModeEnum().default('learning').notNull(),
    trainingStyle: trainingStyleEnum(),
    pinned: jsonb().$type<DocVersions>(),
    seen: jsonb().$type<DocVersions>(),
    // Material ids, like the doc versions: what the system prompt was built with, and what was folded in since.
    pinnedMaterials: jsonb().$type<string[]>(),
    seenMaterials: jsonb().$type<string[]>(),
    ...timestamps,
  },
  t => [
    index('conversations_plan_idx').on(t.planId),
    // A plan has one mission control session, which never ends.
    uniqueIndex('conversations_plan_mission_key').on(t.planId).where(sql`${t.mode} = 'mission'`),
  ],
).enableRLS()

export const docKindEnum = pgEnum('doc_kind', DOC_KINDS)

/** Doc versions a session's tutor has: `pinned` built its system prompt, `seen` adds what was folded in since. */
export type DocVersions = Partial<Record<DocKind, number>>

export const planDocs = pgTable(
  'plan_docs',
  {
    id: uuid().primaryKey().defaultRandom(),
    planId: uuid().notNull().references(() => plans.id, { onDelete: 'cascade' }),
    kind: docKindEnum().notNull(),
    ...timestamps,
  },
  t => [unique('plan_docs_plan_kind_key').on(t.planId, t.kind)],
).enableRLS()

export const docAuthorEnum = pgEnum('doc_author', ['user', 'tutor'])

// Every save is a new version; the current doc is its highest version. Restoring copies an old body forward.
export const planDocVersions = pgTable(
  'plan_doc_versions',
  {
    id: uuid().primaryKey().defaultRandom(),
    docId: uuid().notNull().references(() => planDocs.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    body: text().notNull(),
    author: docAuthorEnum().notNull(),
    // The session the tutor wrote it from.
    conversationId: uuid().references((): AnyPgColumn => conversations.id, { onDelete: 'set null' }),
    // One line for history and the chat note, e.g. "Units: marked 3 done".
    summary: text(),
    ...timestamps,
  },
  t => [unique('plan_doc_versions_doc_version_key').on(t.docId, t.version)],
).enableRLS()

export const materialKindEnum = pgEnum('material_kind', MATERIAL_KINDS)

// The learner's own material for a plan. Write-once: to change a file, delete it and add another. Deleting
// only sets deleted_at, so sessions that pinned it keep their system prompt; the original leaves Storage.
export const planMaterials = pgTable(
  'plan_materials',
  {
    id: uuid().primaryKey().defaultRandom(),
    planId: uuid().notNull().references(() => plans.id, { onDelete: 'cascade' }),
    kind: materialKindEnum().notNull(),
    name: text().notNull(),
    // The original in the materials bucket; null for pasted text, which is its own original.
    storagePath: text(),
    // Extracted once at upload, as Markdown.
    text: text().notNull(),
    pages: integer(),
    tokens: integer().notNull(),
    ...timestamps,
    deletedAt: timestamp({ withTimezone: true }),
  },
  t => [index('plan_materials_plan_idx').on(t.planId)],
).enableRLS()

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
