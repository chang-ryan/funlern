import type { UIMessage } from 'ai'

// Thread exchanges folded into main ride on the next main user message as this data part.
export const SIDE_QUESTIONS = 'data-side-questions'

export interface SideQuestion {
  threadId: string
  /** The highlighted passage the thread is about. */
  regarding: string
  /** True when earlier exchanges from this thread were already folded in. */
  continued: boolean
  messages: { role: 'user' | 'assistant', text: string }[]
}

export interface SideQuestionsData { questions: SideQuestion[] }

export function sideQuestionsOf(m: UIMessage): SideQuestionsData | undefined {
  const part = m.parts.find(p => p.type === SIDE_QUESTIONS)
  return part && 'data' in part ? part.data as SideQuestionsData : undefined
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** How the model sees folded side questions, ahead of the user's text. */
export function renderSideQuestions({ questions }: SideQuestionsData) {
  const body = questions.map((q) => {
    const turns = q.messages.map(m => m.role === 'user'
      ? `<learner>${escape(m.text)}</learner>`
      : `<tutor>${escape(m.text)}</tutor>`).join('\n')
    return `<question regarding="${escape(q.regarding)}"${q.continued ? ' continued="true"' : ''}>\n${turns}\n</question>`
  }).join('\n')
  return `<side_questions>\n${body}\n</side_questions>`
}
