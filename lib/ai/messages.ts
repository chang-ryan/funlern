import type { UIMessage } from 'ai'
import type { AddedPart } from '@/lib/added-parts'
import type { MessageMetadata } from '@/lib/db/schema'
import type { PlanUpdate } from '@/lib/plans/updates'
import type { QuizResults } from '@/lib/quiz'
import type { SideQuestionsData } from '@/lib/threads/side-questions'
import { convertToModelMessages } from 'ai'
import { isAddedPart } from '@/lib/added-parts'
import { PLAN_UPDATED, renderPlanUpdate } from '@/lib/plans/updates'
import { QUIZ_RESULTS } from '@/lib/quiz'
import { renderSideQuestions, SIDE_QUESTIONS } from '@/lib/threads/side-questions'
import { parseCommand } from './commands'
import { quizRequest, renderQuizResults } from './prompts/turn'

// How the model sees each part the server adds to a learner message. Typed over every added part, so a new one
// can't be saved without a way to show it to the model.
const RENDER: Record<AddedPart, (data: unknown) => string> = {
  [PLAN_UPDATED]: data => renderPlanUpdate(data as PlanUpdate),
  [SIDE_QUESTIONS]: data => renderSideQuestions(data as SideQuestionsData),
  [QUIZ_RESULTS]: data => renderQuizResults(data as QuizResults),
}

/** A /quiz-me message reaches the model as the quiz request; the saved message keeps what the learner typed. */
function frameCommand(m: UIMessage): UIMessage {
  const command = m.role === 'user' ? parseCommand(m) : null
  if (command?.name !== 'quiz-me')
    return m
  return { ...m, parts: [...m.parts.filter(p => p.type !== 'text'), { type: 'text', text: quizRequest(command.args) }] }
}

/** A learner message reaches the model with the day it was sent first, from its saved metadata. */
function frameDate(m: UIMessage): UIMessage {
  const sentOn = m.role === 'user' ? (m.metadata as MessageMetadata | undefined)?.sentOn : undefined
  return sentOn ? { ...m, parts: [{ type: 'text', text: `<sent>${sentOn}</sent>` }, ...m.parts] } : m
}

/** Main and thread routes must convert history identically, or the shared prefix stops caching. */
export function toModelMessages(messages: UIMessage[]) {
  return convertToModelMessages(messages.map(m => frameDate(frameCommand(m))), {
    convertDataPart: part => isAddedPart(part.type) ? { type: 'text', text: RENDER[part.type](part.data) } : undefined,
  })
}
