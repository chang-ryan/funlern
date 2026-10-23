'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { NAME_MAX, setDisplayName } from '@/lib/db/profiles'

/** Renames the learner from the profile page; home's greeting follows. */
export async function saveProfile(_prev: { saved: boolean }, form: FormData) {
  const userId = await requireUser()
  const name = z.string().trim().min(1).max(NAME_MAX).parse(form.get('name'))
  await setDisplayName(userId, name)
  revalidatePath('/')
  return { saved: true }
}
