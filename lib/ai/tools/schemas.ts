import { tool } from 'ai'
import { z } from 'zod'

// Tool definitions without server code, so client cards can import them for types.
// Keep schemas flat with enums and a .describe() per field: small open-weight models fail on complex ones.

const option = z.object({
  label: z.string().max(80).describe('Short answer text shown on the button'),
  description: z.string().max(160).optional().describe('One line of extra context'),
})

/** Client tool: renders a multiple-choice card; the answer comes back via addToolOutput. */
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
