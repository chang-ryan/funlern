import { createClient } from '@supabase/supabase-js'
import 'server-only'

/**
 * Supabase with the secret key: bypasses RLS, so only server code that has already checked ownership uses it.
 * For now that is plan material in the private materials bucket.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key?.startsWith('sb_secret_'))
    throw new Error('SUPABASE_SECRET_KEY is missing or not a secret API key (sb_secret_…); see README.')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

export const MATERIALS_BUCKET = 'materials'
