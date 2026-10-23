import postgres from 'postgres'
import { describe, expect, it } from 'vitest'
import { databaseOptions } from './database'
import { assertPreviewIsolation } from './deployment'

describe('database transport', () => {
  it('overrides insecure URL options for hosted connections', async () => {
    const url = 'postgres://user:example@db.example.com:6543/postgres?sslmode=disable'
    const client = postgres(url, databaseOptions(url))
    expect(client.options.ssl).toBe('verify-full')
    expect(client.options.prepare).toBe(false)
    expect(client.options.max).toBe(3)
    await client.end()
  })
  it('keeps local Supabase usable without TLS', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]'])
      expect(databaseOptions(`postgres://user:example@${host}:55322/postgres`).ssl).toBe(false)
    expect(databaseOptions('postgres://user:example@localhost.evil.example/postgres').ssl).toBe('verify-full')
  })
})

describe('preview isolation', () => {
  const preview = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co', DATABASE_URL: 'postgres://postgres.preview:example@pooler.supabase.com:6543/postgres' }
  it('requires separate auth and database settings', () => {
    expect(() => assertPreviewIsolation({ VERCEL_ENV: 'preview' })).toThrow('own NEXT_PUBLIC_SUPABASE_URL')
    expect(() => assertPreviewIsolation({ ...preview, NEXT_PUBLIC_SUPABASE_URL: 'https://zlncroyozoixgobiwuxg.supabase.co' })).toThrow('production')
    expect(() => assertPreviewIsolation({ ...preview, DATABASE_URL: 'postgres://postgres.zlncroyozoixgobiwuxg:example@pooler.supabase.com/postgres' })).toThrow('production')
    expect(() => assertPreviewIsolation({ ...preview, DATABASE_URL: 'postgres://postgres:example@db.zlncroyozoixgobiwuxg.supabase.co/postgres' })).toThrow('production')
    expect(() => assertPreviewIsolation(preview)).not.toThrow()
    expect(() => assertPreviewIsolation({ VERCEL_ENV: 'production' })).not.toThrow()
  })
})
