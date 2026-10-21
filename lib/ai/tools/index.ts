import type { SessionMode } from '@/lib/plans/modes'
import { updatePlanDoc } from '@/lib/db/plans'
import { saveQuiz } from '@/lib/db/quizzes'
import { recordSearch, searchesToday } from '@/lib/db/searches'
import { canWriteTraining } from '@/lib/plans/modes'
import { SEARCH_LIMITS, searchWeb } from '@/lib/search/web'
import { createQuiz, updateDoc, webSearch } from './schemas'
import 'server-only'

interface ToolContext {
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
  // One toolsFor per request, so this counts searches within a turn.
  let searches = 0
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
        if (input.doc === 'training' && !canWriteTraining(ctx.mode))
          throw new Error('training.md is written only in training sessions and mission control.')
        return { version: await updatePlanDoc({ ...input, planId: ctx.planId, conversationId: ctx.conversationId }) }
      },
    },
    web_search: {
      ...webSearch,
      execute: async ({ query }: { query: string }) => {
        if (!ctx.planId)
          throw new Error('This chat has no plan.')
        if (++searches > SEARCH_LIMITS.perTurn)
          throw new Error(`At most ${SEARCH_LIMITS.perTurn} searches a turn. Answer with what you found.`)
        if (await searchesToday(ctx.userId) >= SEARCH_LIMITS.perDay)
          throw new Error('The learner has used today\'s searches. Answer from what you know and say it may be out of date.')
        const results = await searchWeb(query)
        await recordSearch({ ...owner, query, results: results.length })
        return { results }
      },
    },
  }
}

/**
 * Plan sessions let the tutor decide when to write a doc or search; other chats never call a tool unforced. A thread
 * must use its session's choice: tool_choice is part of what the cache matches, so a mismatch misses main's cache.
 */
export function toolChoiceFor(conversation: { planId: string | null }) {
  return conversation.planId ? 'auto' as const : 'none' as const
}
