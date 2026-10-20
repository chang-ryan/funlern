import type { UIMessage } from 'ai'

// Client-safe quiz helpers. The quiz itself lives in the quizzes tables (lib/db/quizzes.ts); messages carry
// only the tutor's create_quiz call (without answers) and the learner's results.

/** The card's tool part: the tutor's create_quiz call, saved with the answers stripped from its input. */
export const QUIZ_PART = 'tool-create_quiz'

/** Ending a quiz (finished or exited) sends the results to the tutor as this data part on a learner message. */
export const QUIZ_RESULTS = 'data-quiz-results'

export type QuizEnd = 'completed' | 'exited'

export interface QuizResults {
  quizId: string
  title: string
  status: QuizEnd
  items: { question: string, choices: string[], picked: number | null, answer: number }[]
}

export function quizResultsOf(m: UIMessage): QuizResults | undefined {
  const part = m.parts.find(p => p.type === QUIZ_RESULTS)
  return part && 'data' in part ? part.data as QuizResults : undefined
}

export function quizIdOf(m: UIMessage): string | undefined {
  const part = m.parts.find(p => p.type === QUIZ_PART)
  return part && 'output' in part ? (part.output as { quizId?: string } | undefined)?.quizId : undefined
}

/** The quiz still waiting on the learner, which blocks the chat: the latest one with no results sent yet. */
export function activeQuizId(messages: UIMessage[]) {
  const ended = new Set(messages.map(m => quizResultsOf(m)?.quizId))
  for (let i = messages.length - 1; i >= 0; i--) {
    const id = quizIdOf(messages[i])
    if (id)
      return ended.has(id) ? null : id
  }
  return null
}

export function tally(items: { picked: number | null, answer: number }[]) {
  const correct = items.filter(i => i.picked === i.answer).length
  const skipped = items.filter(i => i.picked === null).length
  return { correct, wrong: items.length - correct - skipped, skipped }
}

/** '2 correct, 1 wrong, 1 skipped'; zero counts other than correct are left out. */
export function tallyText(items: { picked: number | null, answer: number }[]) {
  const { correct, wrong, skipped } = tally(items)
  return [`${correct} correct`, wrong && `${wrong} wrong`, skipped && `${skipped} skipped`].filter(Boolean).join(', ')
}
