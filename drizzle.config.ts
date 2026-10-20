import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

// Drizzle writes migrations; the Supabase CLI applies them (`supabase migration up` locally, `supabase db push` to hosted).
export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  migrations: { prefix: 'supabase' },
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['public'],
  // Leave Supabase's built-in roles (anon, authenticated, service_role) alone.
  entities: { roles: { provider: 'supabase' } },
  strict: true,
  verbose: true,
})
