import { describe, expect, it } from 'vitest'
import { renderSideQuestions, sideQuestionsOf } from './side-questions'

describe('renderSideQuestions', () => {
  it('renders tagged turns and escapes learner text', () => {
    const out = renderSideQuestions({
      questions: [{ threadId: 't', regarding: 'a "quoted" <b>passage</b>', continued: true, messages: [{ role: 'user', text: 'why x < y?' }, { role: 'assistant', text: 'because & so' }] }],
    })
    expect(out).toBe([
      '<side_questions>',
      '<question regarding="a &quot;quoted&quot; &lt;b&gt;passage&lt;/b&gt;" continued="true">',
      '<learner>why x &lt; y?</learner>',
      '<tutor>because &amp; so</tutor>',
      '</question>',
      '</side_questions>',
    ].join('\n'))
  })
})

describe('sideQuestionsOf', () => {
  it('reads the data part off a message', () => {
    const data = { questions: [] }
    expect(sideQuestionsOf({ id: 'm', role: 'user', parts: [{ type: 'data-side-questions', data }, { type: 'text', text: 'hi' }] })).toBe(data)
    expect(sideQuestionsOf({ id: 'm', role: 'user', parts: [{ type: 'text', text: 'hi' }] })).toBeUndefined()
  })
})
