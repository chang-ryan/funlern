import { PLAN_UPDATED } from './plans/updates'
import { QUIZ_RESULTS } from './quiz'
import { SIDE_QUESTIONS } from './threads/side-questions'

/**
 * Parts the server adds to (or rebuilds on) the learner's message before the tutor sees it: folded side questions,
 * plan doc and material changes, quiz results. Each is saved on the message, echoed to the browser, and rendered
 * for the model by lib/ai/messages.ts, whose renderer map must cover every type here. Client-safe.
 */
export const ADDED_PARTS = [PLAN_UPDATED, SIDE_QUESTIONS, QUIZ_RESULTS] as const
export type AddedPart = (typeof ADDED_PARTS)[number]

export function isAddedPart(type: string): type is AddedPart {
  return (ADDED_PARTS as readonly string[]).includes(type)
}
