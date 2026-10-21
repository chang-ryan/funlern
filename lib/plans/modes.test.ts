import { describe, expect, it } from 'vitest'
import { canWriteTraining, resolveStart } from './modes'

describe('session modes', () => {
  it('resolves how a session starts', () => {
    expect(resolveStart({ mode: 'training', style: 'card' }, null)).toEqual({ mode: 'learning', trainingStyle: null, title: null })
    expect(resolveStart({ mode: 'training' }, { hasTraining: false })).toEqual({ mode: 'learning', trainingStyle: null, title: null })
    expect(resolveStart({ mode: 'training' }, { hasTraining: true })).toEqual({ mode: 'training', trainingStyle: 'guided', title: null })
    expect(resolveStart({ mode: 'mission' }, { hasTraining: false })).toEqual({ mode: 'mission', trainingStyle: null, title: 'Mission control' })
  })

  it('lets only training and mission control write training.md', () => {
    expect([canWriteTraining('learning'), canWriteTraining('training'), canWriteTraining('mission')]).toEqual([false, true, true])
  })
})
