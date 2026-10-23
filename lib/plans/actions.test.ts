import { expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({ requireUser: async () => 'learner' }))
vi.mock('@/lib/db/ai-usage', () => ({ reserveAiRequest: async () => ({ error: 'Try again tomorrow.', retryAfter: 60 }) }))
vi.mock('@/lib/db/plans', () => ({ getPlan: async () => ({ id: 'owned-plan' }) }))
vi.mock('@/lib/db/materials', () => ({ getActiveMaterials: vi.fn() }))
vi.mock('@/lib/db/queries', () => ({ getConversation: vi.fn() }))
vi.mock('ai', () => ({ generateText: vi.fn(), Output: { object: vi.fn() } }))

it('returns the plan quota error without calling the model', async () => {
  const { draftPlan } = await import('./actions')
  const { generateText } = await import('ai')
  expect(await draftPlan('owned-plan', { what: 'History', why: '', level: 'new', seriousness: 'casual' }))
    .toEqual({ error: 'Try again tomorrow.' })
  expect(generateText).not.toHaveBeenCalled()
})
