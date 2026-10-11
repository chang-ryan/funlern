import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import 'server-only'

// Server-side connection bypasses RLS: always scope queries by getUserId().
// prepare: false is required for Supabase's transaction pooler.
const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
