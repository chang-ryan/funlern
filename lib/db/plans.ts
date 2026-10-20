import type { DocVersions } from './schema'
import type { DocKind } from '@/lib/plans/docs'
import { and, desc, eq, isNull, max } from 'drizzle-orm'
import { db } from '.'
import { conversations, planDocs, planDocVersions, plans } from './schema'
import 'server-only'

export interface PlanDoc { kind: DocKind, version: number, body: string, author: 'user' | 'tutor', summary: string | null, createdAt: Date }

/** Creates a plan with version 1 of each doc given. */
export async function createPlan(userId: string, title: string | null, docs: { kind: DocKind, body: string }[]) {
  return db.transaction(async (tx) => {
    const [plan] = await tx.insert(plans).values({ userId, title }).returning({ id: plans.id })
    for (const doc of docs) {
      const [row] = await tx.insert(planDocs).values({ planId: plan.id, kind: doc.kind }).returning({ id: planDocs.id })
      await tx.insert(planDocVersions).values({ docId: row.id, version: 1, body: doc.body, author: 'tutor' })
    }
    return plan.id
  })
}

export async function getPlans(userId: string) {
  return db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.createdAt))
}

export async function getPlan(userId: string, planId: string) {
  const [row] = await db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.userId, userId))).limit(1)
  return row ?? null
}

export async function renamePlan(userId: string, planId: string, title: string | null) {
  await db.update(plans).set({ title }).where(and(eq(plans.id, planId), eq(plans.userId, userId)))
}

/** A plan's sessions, newest first. */
export async function getPlanSessions(userId: string, planId: string) {
  return db.select().from(conversations).where(and(eq(conversations.userId, userId), eq(conversations.planId, planId))).orderBy(desc(conversations.createdAt))
}

/** Sessions with no plan, newest first. */
export async function getUncategorized(userId: string) {
  return db.select().from(conversations).where(and(eq(conversations.userId, userId), isNull(conversations.planId))).orderBy(desc(conversations.createdAt))
}

/** The current version of each of a plan's docs (or of those in `at`, the versions given). */
export async function getPlanDocs(planId: string, at?: DocVersions): Promise<PlanDoc[]> {
  const rows = await db
    .selectDistinctOn([planDocs.kind], {
      kind: planDocs.kind,
      version: planDocVersions.version,
      body: planDocVersions.body,
      author: planDocVersions.author,
      summary: planDocVersions.summary,
      createdAt: planDocVersions.createdAt,
    })
    .from(planDocs)
    .innerJoin(planDocVersions, eq(planDocVersions.docId, planDocs.id))
    .where(eq(planDocs.planId, planId))
    .orderBy(planDocs.kind, desc(planDocVersions.version))
  if (!at)
    return rows
  // Pinned versions: fetch each exactly; a doc created after pinning is left out.
  const pinned = await Promise.all(Object.entries(at).map(([kind, version]) => getDocVersion(planId, kind as DocKind, version!)))
  return pinned.filter(d => d !== null)
}

export async function getDocVersion(planId: string, kind: DocKind, version: number): Promise<PlanDoc | null> {
  const [row] = await db
    .select({ kind: planDocs.kind, version: planDocVersions.version, body: planDocVersions.body, author: planDocVersions.author, summary: planDocVersions.summary, createdAt: planDocVersions.createdAt })
    .from(planDocs)
    .innerJoin(planDocVersions, eq(planDocVersions.docId, planDocs.id))
    .where(and(eq(planDocs.planId, planId), eq(planDocs.kind, kind), eq(planDocVersions.version, version)))
    .limit(1)
  return row ?? null
}

/** Every version of one doc, newest first, for history and restore. */
export async function getDocVersions(planId: string, kind: DocKind): Promise<PlanDoc[]> {
  return db
    .select({ kind: planDocs.kind, version: planDocVersions.version, body: planDocVersions.body, author: planDocVersions.author, summary: planDocVersions.summary, createdAt: planDocVersions.createdAt })
    .from(planDocs)
    .innerJoin(planDocVersions, eq(planDocVersions.docId, planDocs.id))
    .where(and(eq(planDocs.planId, planId), eq(planDocs.kind, kind)))
    .orderBy(desc(planDocVersions.version))
}

/** The latest version number of each doc in a plan. */
export async function latestVersions(planId: string): Promise<DocVersions> {
  const rows = await db
    .select({ kind: planDocs.kind, version: max(planDocVersions.version) })
    .from(planDocs)
    .innerJoin(planDocVersions, eq(planDocVersions.docId, planDocs.id))
    .where(eq(planDocs.planId, planId))
    .groupBy(planDocs.kind)
  return Object.fromEntries(rows.map(r => [r.kind, r.version]))
}

/**
 * Saves a new version of a doc, creating the doc on its first save. Returns the new version number.
 * The doc row is locked so two writers can't take the same number. Callers check plan ownership.
 */
export async function writeDocVersion(input: { planId: string, kind: DocKind, body: string, author: 'user' | 'tutor', conversationId?: string, summary?: string }) {
  return db.transaction(async (tx) => {
    await tx.insert(planDocs).values({ planId: input.planId, kind: input.kind }).onConflictDoNothing()
    const [doc] = await tx.select({ id: planDocs.id }).from(planDocs).where(and(eq(planDocs.planId, input.planId), eq(planDocs.kind, input.kind))).for('update')
    const [{ latest }] = await tx.select({ latest: max(planDocVersions.version) }).from(planDocVersions).where(eq(planDocVersions.docId, doc.id))
    const version = (latest ?? 0) + 1
    await tx.insert(planDocVersions).values({
      docId: doc.id,
      version,
      body: input.body,
      author: input.author,
      conversationId: input.conversationId ?? null,
      summary: input.summary ?? null,
    })
    return version
  })
}

/** Moves a session into a plan (or back to Uncategorized). Its tutor starts from the plan's current docs. */
export async function setConversationPlan(userId: string, conversationId: string, planId: string | null) {
  const versions = planId ? await latestVersions(planId) : null
  await db.update(conversations).set({ planId, pinned: versions, seen: versions }).where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
}
