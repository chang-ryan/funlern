import type { InferUITools, UIMessage } from 'ai'
import type { SessionMode } from '@/lib/plans/modes'
import { updatePlanDoc } from '@/lib/db/plans'
import { saveQuiz } from '@/lib/db/quizzes'
import { createQuiz, updateDoc } from './schemas'
import 'server-only'

export interface ToolContext {
  userId: string
  conversationId: string
  planId?: string | null
  mode?: SessionMode
  /** Set only on the forced /quiz-me call; anywhere else create_quiz refuses. */
  quiz?: boolean
}

// The full tool set goes on every request, main and threads alike: tools sit at the front of the
// cached prefix, so a request that can't use one gates it with toolChoice instead of a smaller set.
// Server tools get their execute here, bound to the request's user and conversation: the model only
// supplies content, never ids, so it can only write into the conversation and plan it is in.
// ask_user stays out until its card exists.
export function toolsFor(ctx: ToolContext) {
  const owner = { userId: ctx.userId, conversationId: ctx.conversationId }
  return {
    create_quiz: {
      ...createQuiz,
      execute: async (input: Parameters<typeof saveQuiz>[1]) => {
        if (!ctx.quiz)
          throw new Error('Quizzes start only when the learner types /quiz-me.')
        return { quizId: await saveQuiz(owner, input) }
      },
    },
    update_doc: {
      ...updateDoc,
      execute: async (input: Omit<Parameters<typeof updatePlanDoc>[0], 'conversationId' | 'planId'>) => {
        if (!ctx.planId)
          throw new Error('This chat has no plan.')
        if (input.doc === 'training' && ctx.mode !== 'training')
          throw new Error('training.md is written only in training sessions.')
        return { version: await updatePlanDoc({ ...input, planId: ctx.planId, conversationId: ctx.conversationId }) }
      },
    },
  }
}

/**
 * Plan sessions let the tutor decide when to write a doc; other chats never call a tool unforced. A thread
 * must use its session's choice: tool_choice is part of what the cache matches, so a mismatch misses main's cache.
 */
export function toolChoiceFor(conversation: { planId: string | null }) {
  return conversation.planId ? 'auto' as const : 'none' as const
}

export type FunlernTools = InferUITools<ReturnType<typeof toolsFor>>
export type FunlernUIMessage = UIMessage<unknown, never, FunlernTools>
