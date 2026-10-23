import { describe, expect, it } from 'vitest'
import { aiLimitBuckets } from './limits'

describe('aI request limits', () => {
  it('shares a UTC day budget across users and separates their personal windows', () => {
    const now = new Date('2026-10-23T03:00:42Z')
    const a = aiLimitBuckets('a', now, {})
    const b = aiLimitBuckets('b', now, {})
    expect(a[0]).toEqual(b[0])
    expect(a.map(x => x.limit)).toEqual([1000, 100, 10])
    expect(a[1].scope).not.toBe(b[1].scope)
    expect(a[1].windowStart.toISOString()).toBe('2026-10-23T00:00:00.000Z')
    expect(a[2].windowStart.toISOString()).toBe('2026-10-23T03:00:00.000Z')
  })
  it('fails closed on invalid configuration', () => {
    for (const value of ['', '0', '-1', 'NaN', '1.5', '1000001'])
      expect(() => aiLimitBuckets('a', new Date(), { AI_REQUESTS_PER_DAY: value })).toThrow('AI_REQUESTS_PER_DAY')
  })
})
