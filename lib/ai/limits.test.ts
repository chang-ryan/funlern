import { describe, expect, it } from 'vitest'
import { aiLimitBuckets, unitsFor } from './limits'

describe('aI request limits', () => {
  it('shares a UTC day budget across users and separates their personal windows', () => {
    const now = new Date('2026-10-23T03:00:42Z')
    const a = aiLimitBuckets('a', now, {})
    const b = aiLimitBuckets('b', now, {})
    // Personal windows first, so a learner over their own limit never locks the shared row.
    expect(a.map(x => x.scope)).toEqual(['user:a:minute', 'user:a:day', 'global:day'])
    expect(a[2]).toEqual(b[2])
    expect(a.map(x => x.limit)).toEqual([10, 100, 1000])
    expect(a[1].windowStart.toISOString()).toBe('2026-10-23T00:00:00.000Z')
    expect(a[0].windowStart.toISOString()).toBe('2026-10-23T03:00:00.000Z')
  })
  it('skips the shared budget for exempt users only', () => {
    const env = { AI_GLOBAL_EXEMPT_USER_IDS: 'owner, other' }
    expect(aiLimitBuckets('owner', new Date(), env).map(x => x.scope)).toEqual(['user:owner:minute', 'user:owner:day'])
    expect(aiLimitBuckets('stranger', new Date(), env).at(-1)?.scope).toBe('global:day')
    expect(aiLimitBuckets('', new Date(), { AI_GLOBAL_EXEMPT_USER_IDS: ' , ' }).at(-1)?.scope).toBe('global:day')
  })
  it('counts Sonnet as three Haiku requests, and an unknown model as the most expensive', () => {
    expect([unitsFor('claude-haiku-5-5'), unitsFor('claude-sonnet-5-5'), unitsFor('claude-opus-9')]).toEqual([1, 3, 3])
  })
  it('fails closed on invalid configuration', () => {
    for (const value of ['', '0', '-1', 'NaN', '1.5', '1000001'])
      expect(() => aiLimitBuckets('a', new Date(), { AI_REQUESTS_PER_DAY: value })).toThrow('AI_REQUESTS_PER_DAY')
  })
})
