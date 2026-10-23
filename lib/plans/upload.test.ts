import { afterEach, expect, it, vi } from 'vitest'
import { MATERIAL_LIMITS } from './material'
import { uploadMaterial } from './upload'

afterEach(() => vi.unstubAllGlobals())

it('refuses an oversized file before sending it to Vercel', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const file = new File([new Uint8Array(MATERIAL_LIMITS.bytes + 1)], 'large.pdf')
  expect(await uploadMaterial('plan', { file })).toBe('That file is over 4MB.')
  expect(fetch).not.toHaveBeenCalled()
})

it('shows a server quota error to the learner', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Try again tomorrow.' }, { status: 429 })))
  expect(await uploadMaterial('plan', { name: 'Notes', text: 'hello' })).toBe('Try again tomorrow.')
})
