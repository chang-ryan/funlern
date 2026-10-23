import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { isLocalDatabase } from '@/lib/config/database'

vi.mock('server-only', () => ({}))

const connection = process.env.TEST_DATABASE_URL
// Never run these write-based tests against hosted data. Each run uses an isolated local schema.
if (connection && !isLocalDatabase(connection))
  throw new Error('TEST_DATABASE_URL must point at local Postgres.')
const namespace = `hardening_${randomUUID().replaceAll('-', '')}`
const client = postgres(connection ?? 'postgres://localhost/postgres', { max: 6, prepare: false, connection: { search_path: namespace } })
vi.mock('.', () => ({ db: drizzle(client, { casing: 'snake_case' }) }))

const owner = randomUUID()
const other = randomUUID()
const third = randomUUID()
const count = async (q: Promise<{ count: number }[]>) => (await q)[0].count
let queries: typeof import('./queries')
let reserve: typeof import('./ai-usage').reserveAiRequest

describe.skipIf(!connection)('database security regressions', () => {
  beforeAll(async () => {
    await client.unsafe(`create schema "${namespace}"`)
    await client`create table profiles (id uuid primary key)`
    await client`insert into profiles (id) values (${owner}), (${other}), (${third})`
    // Copy the real message constraints/indexes, without foreign keys to app data.
    await client`create table messages (like public.messages including all)`
    await client`create table thread_messages (like public.thread_messages including all)`
    const migration = readFileSync(new URL('../../supabase/migrations/20261023040758_ai_usage_counters.sql', import.meta.url), 'utf8')
    await client.unsafe(migration.replaceAll('"public".', `"${namespace}".`))
    queries = await import('./queries')
    ;({ reserveAiRequest: reserve } = await import('./ai-usage'))
  })
  beforeEach(async () => {
    vi.unstubAllEnvs()
    await client`truncate ai_usage_counters, messages, thread_messages`
  })
  afterAll(async () => {
    vi.unstubAllEnvs()
    await client.unsafe(`drop schema if exists "${namespace}" cascade`)
    await client.end()
  })

  it.each(['main', 'thread'] as const)('refuses a foreign message ID in %s while allowing a retry in its original parent', async (kind) => {
    const save = kind === 'main' ? queries.saveMessages : queries.saveThreadMessages
    const victimParent = randomUUID()
    const attackerParent = randomUUID()
    const original = { id: randomUUID(), role: 'user' as const, parts: [{ type: 'text' as const, text: 'Original private message' }] }
    await save(victimParent, [original])
    await expect(save(attackerParent, [{ ...original, id: randomUUID() }, { ...original, parts: [{ type: 'text', text: 'Forged overwrite' }] }])).rejects.toThrow('already in use')
    const rows = kind === 'main' ? await client`select parts from messages` : await client`select parts from thread_messages`
    expect(rows).toHaveLength(1) // The failed batch must not partially save the new message either.
    expect(rows[0].parts).toEqual(original.parts)
    await save(victimParent, [{ ...original, parts: [{ type: 'text', text: 'Legitimate retry' }] }])
    const retried = kind === 'main' ? await client`select parts from messages` : await client`select parts from thread_messages`
    expect(retried[0].parts[0].text).toBe('Legitimate retry')
  })

  it('atomically caps concurrent requests and rolls back rejected global/day increments', async () => {
    vi.stubEnv('AI_REQUESTS_PER_MINUTE', '2')
    const results = await Promise.all(Array.from({ length: 8 }, () => reserve(owner)))
    expect(results.filter(r => r === null)).toHaveLength(2)
    expect(results.filter(r => r?.retryAfter && r.retryAfter <= 60)).toHaveLength(6)
    const rows = await client`select requests from ai_usage_counters`
    expect(rows).toHaveLength(3)
    expect(rows.every(r => r.requests === 2)).toBe(true)
    // Another learner has a separate personal allowance.
    expect(await reserve(other)).toBeNull()
  })

  it('enforces the global budget across learners, and the personal daily budget across minutes', async () => {
    vi.stubEnv('AI_REQUESTS_GLOBAL_PER_DAY', '2')
    vi.stubEnv('AI_REQUESTS_PER_DAY', '1')
    expect(await reserve(owner)).toBeNull()
    expect((await reserve(owner))?.error).toContain('today\'s tutor limit')
    expect(await reserve(other)).toBeNull()
    expect((await reserve(third))?.error).toContain('shared usage limit')
    // A learner over their own limit never reached the shared row.
    expect((await client`select requests from ai_usage_counters where scope = 'global:day'`)[0].requests).toBe(2)
  })

  it('lets exempt users past the shared budget, never past their own', async () => {
    vi.stubEnv('AI_REQUESTS_GLOBAL_PER_DAY', '1')
    vi.stubEnv('AI_REQUESTS_PER_DAY', '2')
    vi.stubEnv('AI_GLOBAL_EXEMPT_USER_IDS', ` ${owner} ,x`)
    expect(await reserve(other)).toBeNull()
    expect((await reserve(third))?.error).toContain('shared usage limit')
    expect(await reserve(owner)).toBeNull()
    expect(await reserve(owner)).toBeNull()
    expect((await reserve(owner))?.error).toContain('today\'s tutor limit')
  })

  it('counts units, and refuses a request bigger than what is left', async () => {
    vi.stubEnv('AI_REQUESTS_PER_DAY', '4')
    expect(await reserve(owner, 3)).toBeNull()
    expect((await reserve(owner, 3))?.error).toContain('today\'s tutor limit')
    expect(await reserve(owner, 1)).toBeNull()
    expect((await client`select requests from ai_usage_counters where scope = ${`user:${owner}:day`}`)[0].requests).toBe(4)
    vi.stubEnv('AI_REQUESTS_PER_MINUTE', '2')
    expect((await reserve(other, 3))?.error).toContain('too quickly')
  })

  it('prunes a learner\'s windows from before today', async () => {
    await client`insert into ai_usage_counters (scope, window_start, user_id, requests) values (${`user:${owner}:minute`}, now() - interval '2 days', ${owner}, 5)`
    expect(await reserve(owner)).toBeNull()
    expect(await count(client`select count(*)::int from ai_usage_counters where user_id = ${owner} and window_start < now() - interval '1 day'`)).toBe(0)
  })

  it('does not carry yesterday\'s usage into today', async () => {
    await client`insert into ai_usage_counters (scope, window_start, requests) values ('global:day', date_trunc('day', now() at time zone 'UTC') - interval '1 day', 1000000)`
    expect(await reserve(owner)).toBeNull()
  })
})
