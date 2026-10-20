import { describe, expect, it } from 'vitest'
import { materialRefusal } from './material'

describe('material limits', () => {
  it('allows a file within every limit', () => {
    expect(materialRefusal([{ tokens: 1000 }], { tokens: 2000 })).toBeNull()
  })

  it('refuses a sixth file, or going over the token budget', () => {
    expect(materialRefusal(Array.from({ length: 5 }, () => ({ tokens: 10 })), { tokens: 10 })).toMatch(/at most 5 files/)
    expect(materialRefusal([{ tokens: 29_000 }], { tokens: 2000 })).toMatch(/1,000 left/)
  })
})
