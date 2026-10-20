import type { conversations } from '@/lib/db/schema'
import { getPlanDocs } from '@/lib/db/plans'
import { planBlock } from './prompts/plan'
import { SYSTEM_PROMPT } from './prompts/system'
import 'server-only'

type Conversation = Pick<typeof conversations.$inferSelect, 'planId' | 'pinned'>

/**
 * The system prompt for a session: the tutor's, plus its plan's docs at the versions pinned when it started.
 * Main and thread routes both use it, so their shared prefix stays cached. Uncategorized chats get the tutor's alone.
 */
export async function systemFor(conversation: Conversation) {
  if (!conversation.planId)
    return SYSTEM_PROMPT
  const docs = await getPlanDocs(conversation.planId, conversation.pinned ?? undefined)
  return `${SYSTEM_PROMPT}\n\n${planBlock(docs)}`
}
