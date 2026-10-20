import { describe, expect, it } from 'vitest'
import { TRAINING_PRINCIPLES, TRAINING_SETUP, trainingRep } from './mode'
import { planBlock } from './plan'
import { SYSTEM_PROMPT } from './system'
import { planDraftPrompt } from './tasks/plan-draft'
import { titlePrompt } from './tasks/title'
import { quizRequest, renderQuizResults, threadFrame } from './turn'

// Pins the exact bytes sent to the model. A change here invalidates the prompt cache and changes
// tutor behavior, so update the snapshot only on purpose (`pnpm test -u`).
describe('prompts', () => {
  it('system prompt', () => {
    expect(SYSTEM_PROMPT).toMatchSnapshot()
  })

  it('thread frame', () => {
    const anchor = { quote: 'first line\nsecond line', prefix: '', suffix: '' }
    expect(threadFrame(anchor, 'Why the second line?')).toMatchSnapshot()
  })

  it('plan block', () => {
    const doc = { version: 1, author: 'tutor' as const, summary: null, createdAt: new Date(0) }
    expect(planBlock([
      { ...doc, kind: 'syllabus', body: '## Units\n\n- [ ] Closures\n\n## Notes\n' },
      { ...doc, kind: 'brief', body: '## Goal\n\nRead JS fluently\n' },
    ])).toMatchSnapshot()
  })

  it('training', () => {
    expect(TRAINING_PRINCIPLES).toMatchSnapshot()
    expect(TRAINING_SETUP).toMatchSnapshot()
    expect(trainingRep('guided')).toMatchSnapshot()
    expect(trainingRep('full')).toMatchSnapshot()
    expect(trainingRep('card')).toMatchSnapshot()
  })

  it('plan draft', () => {
    expect(planDraftPrompt({ what: 'Rust <ownership>', why: '', level: 'some', seriousness: 'serious', deadline: '2026-12-01' })).toMatchSnapshot()
  })

  it('title', () => {
    expect(titlePrompt('What is a closure?')).toMatchSnapshot()
  })

  it('quiz request', () => {
    expect(quizRequest('')).toMatchSnapshot()
    expect(quizRequest('closures')).toMatchSnapshot()
  })

  it('quiz results', () => {
    const choices = ['one', 'two', 'three', 'four']
    expect(renderQuizResults({
      quizId: 'q',
      title: 'Closures',
      status: 'exited',
      items: [
        { question: 'First?', choices, picked: 1, answer: 1 },
        { question: 'Second?', choices, picked: 0, answer: 2 },
        { question: 'Third?', choices, picked: null, answer: 3 },
      ],
    })).toMatchSnapshot()
  })
})
