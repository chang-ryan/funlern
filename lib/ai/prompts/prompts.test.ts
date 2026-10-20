import { describe, expect, it } from 'vitest'
import { SYSTEM_PROMPT } from './system'
import { titlePrompt } from './title'
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
