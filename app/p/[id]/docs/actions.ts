'use server'

import type { DocKind, Sections } from '@/lib/plans/docs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDocVersion, getPlan, latestVersions, writeDocVersion } from '@/lib/db/plans'
import { DOC_KINDS, DOC_SECTIONS, parseDoc, renderDoc } from '@/lib/plans/docs'
import { getUserId } from '@/lib/supabase/server'

export type SaveResult = { ok: true, version: number } | { ok: false, error: string }

async function requirePlan(planId: string) {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  if (!z.uuid().safeParse(planId).success || !await getPlan(userId, planId))
    throw new Error('Not found')
}

const kindSchema = z.enum(DOC_KINDS)

/**
 * Saves the learner's edit of one section as a new version of the doc. `baseVersion` is the version the edit
 * started from: if the tutor (or another tab) saved since, the edit is refused rather than silently undoing theirs.
 */
export async function saveDocSection(input: { planId: string, kind: DocKind, section: string, text: string, baseVersion: number }): Promise<SaveResult> {
  await requirePlan(input.planId)
  const kind = kindSchema.parse(input.kind)
  if (!(DOC_SECTIONS[kind] as readonly string[]).includes(input.section))
    throw new Error('Unknown section')
  const text = z.string().max(50_000).parse(input.text)

  const latest = (await latestVersions(input.planId))[kind]
  if (latest !== input.baseVersion)
    return { ok: false, error: `This doc changed since you opened it (now version ${latest}). Reload to see it, then edit again.` }
  const current = await getDocVersion(input.planId, kind, latest)
  if (!current)
    throw new Error('Not found')

  const sections: Sections = { ...parseDoc(kind, current.body), [input.section]: text }
  const version = await writeDocVersion({ planId: input.planId, kind, body: renderDoc(kind, sections), author: 'user', summary: `${input.section}: edited` })
  revalidatePath(`/p/${input.planId}`, 'layout')
  return { ok: true, version }
}

/** Restores an old version by copying its body forward as a new version; nothing is deleted. */
export async function restoreDocVersion(input: { planId: string, kind: DocKind, version: number }): Promise<SaveResult> {
  await requirePlan(input.planId)
  const kind = kindSchema.parse(input.kind)
  const old = await getDocVersion(input.planId, kind, z.number().int().positive().parse(input.version))
  if (!old)
    throw new Error('Not found')
  const version = await writeDocVersion({ planId: input.planId, kind, body: old.body, author: 'user', summary: `Restored version ${old.version}` })
  revalidatePath(`/p/${input.planId}`, 'layout')
  return { ok: true, version }
}
