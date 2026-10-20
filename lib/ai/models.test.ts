import { describe, expect, it } from 'vitest'
import { isModelId, modelLabel } from './models'

describe('modelLabel', () => {
  it('names current model ids', () => {
    expect(modelLabel('claude-haiku-5-5')).toBe('Claude Haiku 5.5')
    expect(modelLabel('claude-sonnet-5-5')).toBe('Claude Sonnet 5.5')
    expect(modelLabel('claude-fable-5-1')).toBe('Claude Fable 5.1')
    expect(modelLabel('claude-opus-5')).toBe('Claude Opus 5')
  })

  it('shows anything else as is', () => {
    expect(modelLabel('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5-20251001')
  })
})

describe('isModelId', () => {
  it('accepts only the models on offer', () => {
    expect(isModelId('claude-haiku-5-5')).toBe(true)
    expect(isModelId('claude-sonnet-5-5')).toBe(true)
    expect(isModelId('claude-opus-5-5')).toBe(false)
    expect(isModelId(undefined)).toBe(false)
  })
})
