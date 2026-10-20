import type { UIMessage } from 'ai'
import type { QuizResults } from '@/lib/quiz'
import type { SideQuestionsData } from '@/lib/threads/side-questions'
import { convertToModelMessages } from 'ai'
import { QUIZ_RESULTS } from '@/lib/quiz'
import { renderSideQuestions, SIDE_QUESTIONS } from '@/lib/threads/side-questions'
import { parseCommand } from './commands'
import { quizRequest, renderQuizResults } from './prompts/turn'

/** A /quiz-me message reaches the model as the quiz request; the saved message keeps what the learner typed. */
function frameCommand(m: UIMessage): UIMessage {
  const command = m.role === 'user' ? parseCommand(m) : null
  if (command?.name !== 'quiz-me')
    return m
  return { ...m, parts: [...m.parts.filter(p => p.type !== 'text'), { type: 'text', text: quizRequest(command.args) }] }
}

/** Main and thread routes must convert history identically, or the shared prefix stops caching. */
export function toModelMessages(messages: UIMessage[]) {
  return convertToModelMessages(messages.map(frameCommand), {
    convertDataPart: (part) => {
      if (part.type === SIDE_QUESTIONS)
        return { type: 'text', text: renderSideQuestions(part.data as SideQuestionsData) }
      if (part.type === QUIZ_RESULTS)
        return { type: 'text', text: renderQuizResults(part.data as QuizResults) }
      return undefined
    },
  })
}
