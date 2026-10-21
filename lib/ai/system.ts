import type { conversations } from '@/lib/db/schema'
import { getMaterialsByIds } from '@/lib/db/materials'
import { getPlanDocs } from '@/lib/db/plans'
import { MISSION_CONTROL, TRAINING_PRINCIPLES, TRAINING_SETUP, trainingRep } from './prompts/mode'
import { planBlock } from './prompts/plan'
import { SYSTEM_PROMPT } from './prompts/system'
import 'server-only'

type Conversation = Pick<typeof conversations.$inferSelect, 'planId' | 'context' | 'mode' | 'trainingStyle'>

/**
 * The system prompt for a session: the tutor's, plus its plan's docs and material as pinned when it started,
 * plus how a training session runs. Everything in it is fixed for the session, and main and thread routes
 * both use it, so their shared prefix stays cached. Uncategorized chats get the tutor's alone.
 */
export async function systemFor(conversation: Conversation) {
  if (!conversation.planId)
    return SYSTEM_PROMPT
  const [docs, materials] = await Promise.all([
    getPlanDocs(conversation.planId, conversation.context?.pinned.docs),
    getMaterialsByIds(conversation.planId, conversation.context?.pinned.materials ?? []),
  ])
  const parts = [SYSTEM_PROMPT, planBlock(docs, materials)]
  if (conversation.mode === 'mission')
    parts.push(MISSION_CONTROL, TRAINING_PRINCIPLES, TRAINING_SETUP)
  // Sessions from before mission control could start training with no style (to set it up); run them as guided reps.
  if (conversation.mode === 'training')
    parts.push(TRAINING_PRINCIPLES, trainingRep(conversation.trainingStyle ?? 'guided'))
  return parts.join('\n\n')
}
