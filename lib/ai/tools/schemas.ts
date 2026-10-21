import { tool } from 'ai'
import { z } from 'zod'
import { DOC_FILE, DOC_KINDS, DOC_SECTIONS } from '@/lib/plans/docs'

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

// Every section name across the doc templates, so the tool's schema follows docs.ts.
const ALL_SECTIONS = [...new Set(DOC_KINDS.flatMap(k => DOC_SECTIONS[k]))] as [string, ...string[]]

/**
 * Server tool: rewrites one section of a plan doc as a new version (the execute is bound per request in
 * ./index.ts). Only plan sessions can call it.
 */
export const updateDoc = tool({
  description: 'Rewrite one section of the learner\'s plan doc, e.g. tick off a unit in syllabus.md or add a rep to training.md\'s Log. Only at natural points: after quiz results, when a unit or rep is done, or when the learner asks. The whole section is replaced, so include everything that should stay. training.md is written only in training sessions and mission control.',
  inputSchema: z.object({
    doc: z.enum(DOC_KINDS).describe(DOC_KINDS.map(k => DOC_FILE[k]).join(', ')),
    section: z.enum(ALL_SECTIONS).describe(DOC_KINDS.map(k => `${k}: ${DOC_SECTIONS[k].join(', ')}`).join('. ')),
    content: z.string().max(8000).describe('The new Markdown for the section, without its heading'),
    summary: z.string().max(100).describe('What changed, in a few words, e.g. "Marked closures done"'),
  }),
  outputSchema: z.object({
    version: z.number().describe('The doc\'s new version'),
  }),
})
