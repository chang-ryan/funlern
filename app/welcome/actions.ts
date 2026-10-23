'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { NAME_MAX, setDisplayName } from '@/lib/db/profiles'

/** Saves a new sign-up's name, then goes home. */
export async function saveName(form: FormData) {
  const userId = await requireUser()
  const name = z.string().trim().min(1).max(NAME_MAX).parse(form.get('name'))
  await setDisplayName(userId, name)
  redirect('/')
}
