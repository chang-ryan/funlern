import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import 'server-only'

// Server-side connection bypasses RLS: always scope queries by getUserId().
// prepare: false is required for Supabase's transaction pooler.
// Reuse one client across dev hot reloads instead of opening a new pool each time.
const globalForDb = globalThis as unknown as { pg?: postgres.Sql }
const client = globalForDb.pg ?? postgres(process.env.DATABASE_URL!, { prepare: false })
if (process.env.NODE_ENV !== 'production')
  globalForDb.pg = client

export const db = drizzle(client, { schema, casing: 'snake_case' })
