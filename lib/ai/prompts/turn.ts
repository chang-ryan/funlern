import type { Anchor } from '@/lib/db/schema'
import type { QuizResults } from '@/lib/quiz'
import dedent from 'dedent'
import { tallyText } from '@/lib/quiz'

// Per-turn additions ride in the user message, never the system prompt, so the cached prefix stays intact.

/** Thread prompt: frames the first question of a side thread with the passage it quotes. */
export function threadFrame(anchor: Anchor, question: string) {
  const quote = anchor.quote.split('\n').map(l => `> ${l}`).join('\n')
  return dedent`
    You are now answering a side question about one passage from your earlier answer:
    ${quote}

    Answer briefly and only about that passage. The learner will return to the main lesson afterwards.

    Question: ${question}
  `
}

/** What the model sees for a /quiz-me message: create_quiz is forced on that turn, so this only steers the content. */
export function quizRequest(topic: string) {
  return dedent`
    The learner asked for a quiz (/quiz-me). Write one with create_quiz on ${topic ? `this topic: ${topic}` : 'what we have covered so far'}.
    Ask about what we actually discussed, at the level we discussed it.
  `
}

const LETTERS = ['A', 'B', 'C', 'D']

/** The learner's quiz results, as the model sees them, with how to respond. */
export function renderQuizResults(results: QuizResults) {
  const items = results.items.map((item, i) => {
    const choices = item.choices.map((c, j) => `${LETTERS[j]}) ${c}`).join('\n')
    const outcome = item.picked === null
      ? `Skipped. Correct: ${LETTERS[item.answer]}`
      : item.picked === item.answer
        ? `Correct (${LETTERS[item.picked]})`
        : `Wrong: picked ${LETTERS[item.picked]}. Correct: ${LETTERS[item.answer]}`
    return `${i + 1}. ${item.question}\n${choices}\n${outcome}`
  }).join('\n\n')
  const how = results.status === 'exited' ? 'The learner exited the quiz early; unanswered questions are skipped.' : 'The learner finished the quiz.'
  return dedent`
    <quiz_results title="${results.title.replace(/"/g, '&quot;')}" score="${tallyText(results.items)}">
    ${items}
    </quiz_results>

    ${how} Give the score in one line.
    If everything is correct, give two or three quick takeaways and move the lesson on.
    Otherwise, explain each wrong or skipped question in more detail: why the correct answer is right and, for a wrong pick, why that choice is tempting but wrong. Skip the ones they got right.
    End by suggesting where to go next.
  `
}
