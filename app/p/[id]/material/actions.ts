'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePlan } from '@/lib/auth'
import { softDeleteMaterial } from '@/lib/db/materials'
import { createAdminClient, MATERIALS_BUCKET } from '@/lib/supabase/admin'

/**
 * Deletes a file from a plan's material. Its text stays for sessions that pinned it; the original leaves
 * Storage now. Running sessions hear about it on their next message.
 */
export async function deleteMaterial(planId: string, materialId: string) {
  await requirePlan(planId)
  if (!z.uuid().safeParse(materialId).success)
    throw new Error('Not found')
  const row = await softDeleteMaterial(planId, materialId)
  if (row?.storagePath)
    await createAdminClient().storage.from(MATERIALS_BUCKET).remove([row.storagePath])
  revalidatePath(`/p/${planId}`, 'layout')
}
