import type { InferUITools, UIMessage } from 'ai'
import { saveQuiz } from '@/lib/db/quizzes'
import { askUser, createQuiz } from './schemas'
import 'server-only'

export interface ToolContext { userId: string, conversationId: string }

// The full tool set goes on every request, main and threads alike: tools sit at the front of the
// cached prefix, so threads gate with toolChoice 'none' instead of sending a smaller set.
// Server tools get their execute here, bound to the request's user and conversation: the model only
// supplies content, never ids, so it can only write a quiz into the conversation it is in.
export function toolsFor(ctx: ToolContext) {
  return {
    ask_user: askUser,
    create_quiz: { ...createQuiz, execute: async (input: Parameters<typeof saveQuiz>[1]) => ({ quizId: await saveQuiz(ctx, input) }) },
  }
}

// The model calls a tool only when a turn forces one (/quiz-me forces create_quiz). ask_user has no card yet.
export const TOOL_CHOICE = 'none' as const

export type FunlernTools = InferUITools<ReturnType<typeof toolsFor>>
export type FunlernUIMessage = UIMessage<unknown, never, FunlernTools>
