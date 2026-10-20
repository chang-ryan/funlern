import type { MaterialKind } from '@/lib/plans/material'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '.'
import { planMaterials } from './schema'
import 'server-only'

export type Material = typeof planMaterials.$inferSelect

/** A plan's material that isn't deleted, oldest first: what a new session pins. */
export async function getActiveMaterials(planId: string) {
  return db.select().from(planMaterials).where(and(eq(planMaterials.planId, planId), isNull(planMaterials.deletedAt))).orderBy(asc(planMaterials.createdAt))
}

/** Material by id within a plan, deleted or not: a session's pinned files keep their text after a delete. */
export async function getMaterialsByIds(planId: string, ids: string[]) {
  if (!ids.length)
    return []
  const rows = await db.select().from(planMaterials).where(and(eq(planMaterials.planId, planId), inArray(planMaterials.id, ids)))
  return ids.map(id => rows.find(r => r.id === id)).filter(r => r !== undefined)
}

export async function insertMaterial(input: { id: string, planId: string, kind: MaterialKind, name: string, storagePath: string | null, text: string, pages: number | null, tokens: number }) {
  await db.insert(planMaterials).values(input)
}

/** Marks a file deleted; returns its Storage path (to remove the original), or undefined if there was none. */
export async function softDeleteMaterial(planId: string, id: string) {
  const [row] = await db.update(planMaterials).set({ deletedAt: new Date() }).where(and(eq(planMaterials.id, id), eq(planMaterials.planId, planId), isNull(planMaterials.deletedAt))).returning({ storagePath: planMaterials.storagePath })
  return row
}

/**
 * Material changes a session's tutor hasn't seen: files added since (with their text) and files deleted since.
 * Returns them with the new `seen`, the plan's current material ids.
 */
export async function foldMaterialUpdates(planId: string, seen: string[]) {
  const active = await getActiveMaterials(planId)
  const added = active.filter(m => !seen.includes(m.id)).map(m => ({ id: m.id, name: m.name, text: m.text }))
  const gone = seen.filter(id => !active.some(m => m.id === id))
  const removed = (await getMaterialsByIds(planId, gone)).map(m => ({ id: m.id, name: m.name }))
  return { added, removed, seen: active.map(m => m.id) }
}
