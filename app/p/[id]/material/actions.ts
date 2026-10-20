'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { softDeleteMaterial } from '@/lib/db/materials'
import { getPlan } from '@/lib/db/plans'
import { createAdminClient, MATERIALS_BUCKET } from '@/lib/supabase/admin'
import { getUserId } from '@/lib/supabase/server'

/**
 * Deletes a file from a plan's material. Its text stays for sessions that pinned it; the original leaves
 * Storage now. Running sessions hear about it on their next message.
 */
export async function deleteMaterial(planId: string, materialId: string) {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  if (!z.uuid().safeParse(materialId).success || !await getPlan(userId, planId))
    throw new Error('Not found')
  const row = await softDeleteMaterial(planId, materialId)
  if (row?.storagePath)
    await createAdminClient().storage.from(MATERIALS_BUCKET).remove([row.storagePath])
  revalidatePath(`/p/${planId}`, 'layout')
}
