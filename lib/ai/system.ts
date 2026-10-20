import type { conversations } from '@/lib/db/schema'
import { getMaterialsByIds } from '@/lib/db/materials'
import { getPlanDocs } from '@/lib/db/plans'
import { TRAINING_PRINCIPLES, TRAINING_SETUP, trainingRep } from './prompts/mode'
import { planBlock } from './prompts/plan'
import { SYSTEM_PROMPT } from './prompts/system'
import 'server-only'

type Conversation = Pick<typeof conversations.$inferSelect, 'planId' | 'pinned' | 'pinnedMaterials' | 'mode' | 'trainingStyle'>

/**
 * The system prompt for a session: the tutor's, plus its plan's docs and material as pinned when it started,
 * plus how a training session runs. Everything in it is fixed for the session, and main and thread routes
 * both use it, so their shared prefix stays cached. Uncategorized chats get the tutor's alone.
 */
export async function systemFor(conversation: Conversation) {
  if (!conversation.planId)
    return SYSTEM_PROMPT
  const [docs, materials] = await Promise.all([
    getPlanDocs(conversation.planId, conversation.pinned ?? undefined),
    getMaterialsByIds(conversation.planId, conversation.pinnedMaterials ?? []),
  ])
  const parts = [SYSTEM_PROMPT, planBlock(docs, materials)]
  if (conversation.mode === 'training')
    parts.push(TRAINING_PRINCIPLES, conversation.trainingStyle ? trainingRep(conversation.trainingStyle) : TRAINING_SETUP)
  return parts.join('\n\n')
}
