import { tool } from 'ai'
import { z } from 'zod'

// Tool definitions without server code, so client cards can import them for types.
// Keep schemas flat with enums and a .describe() per field: small open-weight models fail on complex ones.

const option = z.object({
  label: z.string().max(80).describe('Short answer text shown on the button'),
  description: z.string().max(160).optional().describe('One line of extra context'),
})

/** Client tool: renders a multiple-choice card; the answer comes back via addToolOutput. No card yet, and the model can't call it. */
export const askUser = tool({
  description: 'Ask the learner a clarifying question with 2 to 4 options. Use it to pin down their goal, level or preference instead of guessing.',
  inputSchema: z.object({
    question: z.string().max(200),
    options: z.array(option).min(2).max(4),
  }),
  outputSchema: z.object({
    answer: z.string().describe('The chosen label, or free text from "something else"'),
    skipped: z.boolean(),
  }),
})

const quizQuestion = z.object({
  question: z.string().max(300),
  choices: z.array(z.string().max(120)).length(4).describe('Four answer choices'),
  answer: z.number().int().min(0).max(3).describe('Index of the correct choice'),
  explanation: z.string().max(400).describe('Why the correct choice is right; shown after the learner answers'),
})

/**
 * Server tool: saves the quiz (the execute is bound per request in ./index.ts) and the card shows it.
 * Answers and explanations stay in the database; the saved call keeps only the questions and choices.
 */
export const createQuiz = tool({
  description: 'Write a multiple-choice quiz on what you have covered with the learner: 1 to 5 questions, four choices each, one correct. Test understanding, not recall of wording. Plain text; use `backticks` for code.',
  inputSchema: z.object({
    title: z.string().max(80).describe('Short topic, e.g. "JavaScript closures"'),
    questions: z.array(quizQuestion).min(1).max(5),
  }),
  outputSchema: z.object({
    quizId: z.string().describe('Id of the saved quiz'),
  }),
})
