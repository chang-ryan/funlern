// Public project identifier, not a credential. Update if production moves to another Supabase project.
const PRODUCTION_PROJECT = 'zlncroyozoixgobiwuxg'

/** Stop a preview build before it can ship code with access to production data. */
export function assertPreviewIsolation(env: Record<string, string | undefined>) {
  if (env.VERCEL_ENV !== 'preview')
    return
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'DATABASE_URL']) {
    const value = env[key]
    if (!value)
      throw new Error(`Preview requires its own ${key}; see docs/PRODUCTION.md.`)
    const url = new URL(value)
    if (url.hostname.includes(PRODUCTION_PROJECT) || decodeURIComponent(url.username).includes(PRODUCTION_PROJECT))
      throw new Error(`Preview ${key} points at production. Configure a separate Supabase project; see docs/PRODUCTION.md.`)
  }
}
