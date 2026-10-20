import type { DocVersions } from './schema'
import type { DocKind } from '@/lib/plans/docs'
import type { PlanUpdate } from '@/lib/plans/updates'
import { and, desc, eq, isNull, max, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { DOC_FILE, DOC_SECTIONS, parseDoc, renderDoc } from '@/lib/plans/docs'
import { changedSections } from '@/lib/plans/updates'
import { db } from '.'
import { getActiveMaterials } from './materials'
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

/** The learner's plans, newest first, each with its brief's current body (null if it has none). */
export async function getPlans(userId: string) {
  const rows = await db
    .selectDistinctOn([plans.id], { plan: plans, brief: planDocVersions.body })
    .from(plans)
    .leftJoin(planDocs, and(eq(planDocs.planId, plans.id), eq(planDocs.kind, 'brief')))
    .leftJoin(planDocVersions, eq(planDocVersions.docId, planDocs.id))
    .where(eq(plans.userId, userId))
    .orderBy(plans.id, desc(planDocVersions.version))
  return rows
    .map(r => ({ ...r.plan, brief: r.brief }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/** The learner's plan, or null for anyone else's or a malformed id (ids come from URLs and request bodies). */
export async function getPlan(userId: string, planId: string) {
  if (!z.uuid().safeParse(planId).success)
    return null
  const [row] = await db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.userId, userId))).limit(1)
  return row ?? null
}

export async function renamePlan(userId: string, planId: string, title: string | null) {
  await db.update(plans).set({ title }).where(and(eq(plans.id, planId), eq(plans.userId, userId)))
}

/** A plan's sessions, newest first. */
/** A plan's learning and training sessions, newest first; mission control is reached on its own. */
export async function getPlanSessions(userId: string, planId: string) {
  return db.select().from(conversations).where(and(eq(conversations.userId, userId), eq(conversations.planId, planId), ne(conversations.mode, 'mission'))).orderBy(desc(conversations.createdAt))
}

/** The plan's mission control session, or null before its first message. */
export async function getMissionSession(userId: string, planId: string) {
  const [row] = await db.select().from(conversations).where(and(eq(conversations.userId, userId), eq(conversations.planId, planId), eq(conversations.mode, 'mission'))).limit(1)
  return row ?? null
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
  const materials = planId ? (await getActiveMaterials(planId)).map(m => m.id) : null
  await db.update(conversations).set({ planId, pinned: versions, seen: versions, pinnedMaterials: materials, seenMaterials: materials }).where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
}

/**
 * Doc changes a session's tutor hasn't seen: for each doc past its `seen` version, the sections that differ.
 * Returns the update to fold into the next learner message (null when nothing changed) and the new `seen`.
 */
export async function foldPlanUpdates(planId: string, seen: DocVersions): Promise<{ data: PlanUpdate | null, seen: DocVersions }> {
  const latest = await latestVersions(planId)
  const docs: PlanUpdate['docs'] = []
  for (const [kind, version] of Object.entries(latest) as [DocKind, number][]) {
    const from = seen[kind] ?? 0
    if (version <= from)
      continue
    const [before, after] = await Promise.all([from ? getDocVersion(planId, kind, from) : null, getDocVersion(planId, kind, version)])
    const sections = changedSections(kind, before?.body ?? '', after?.body ?? '')
    if (Object.keys(sections).length)
      docs.push({ kind, version, sections })
  }
  return { data: docs.length ? { docs } : null, seen: { ...seen, ...latest } }
}

/**
 * The tutor's update_doc: replaces one section of the current version as a new version. The writing session's
 * `seen` moves to it only if the tutor had seen the version it wrote on; otherwise the next fold still sends
 * the edits it missed.
 */
export async function updatePlanDoc(input: { planId: string, conversationId: string, doc: DocKind, section: string, content: string, summary: string }) {
  if (!(DOC_SECTIONS[input.doc] as readonly string[]).includes(input.section))
    throw new Error(`${DOC_FILE[input.doc]} has no section "${input.section}". Its sections: ${DOC_SECTIONS[input.doc].join(', ')}.`)
  const current = (await getPlanDocs(input.planId)).find(d => d.kind === input.doc)
  const body = renderDoc(input.doc, { ...parseDoc(input.doc, current?.body ?? ''), [input.section]: input.content })
  const version = await writeDocVersion({ planId: input.planId, kind: input.doc, body, author: 'tutor', conversationId: input.conversationId, summary: input.summary })
  await db.update(conversations)
    .set({ seen: sql`coalesce(${conversations.seen}, '{}'::jsonb) || jsonb_build_object(${input.doc}::text, ${version}::int)` })
    .where(and(eq(conversations.id, input.conversationId), sql`coalesce((${conversations.seen} ->> ${input.doc}::text)::int, 0) = ${current?.version ?? 0}`))
  return version
}

export async function setSeen(conversationId: string, seen: DocVersions, seenMaterials: string[]) {
  await db.update(conversations).set({ seen, seenMaterials }).where(eq(conversations.id, conversationId))
}
