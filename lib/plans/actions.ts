'use server'

import type { WizardInput } from './wizard'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { AI_OUTPUT_TOKENS } from '@/lib/ai/limits'
import { currentModel, NO_THINKING } from '@/lib/ai/model'
import { planDraftPrompt } from '@/lib/ai/prompts/tasks/plan-draft'
import { requireUser } from '@/lib/auth'
import { reserveAiRequest } from '@/lib/db/ai-usage'
import { getActiveMaterials } from '@/lib/db/materials'
import * as plans from '@/lib/db/plans'
import { getConversation } from '@/lib/db/queries'
import { renderDoc } from './docs'
import { LEVELS, SERIOUSNESS } from './wizard'

const wizardInput = z.object({
  what: z.string().trim().min(1).max(2000),
  why: z.string().trim().max(2000),
  level: z.enum(LEVELS),
  seriousness: z.enum(SERIOUSNESS),
  deadline: z.iso.date().optional(),
})

const section = z.string().describe('Markdown; empty string if nothing to say')
const draft = z.object({
  title: z.string(),
  brief: z.object({ Goal: section, Why: section, Level: section, Seriousness: section, Constraints: section }),
  syllabus: z.object({ Units: section, Notes: section }),
})

/**
 * Starts a plan from the new-plan form, with no docs yet: the form uploads its material to it next, then
 * calls draftPlan, so the first brief and syllabus can draw on that material.
 */
export async function startPlan(input: WizardInput): Promise<{ planId: string }> {
  const userId = await requireUser()
  wizardInput.parse(input)
  return { planId: await plans.createPlan(userId, null, []) }
}

/** The tutor drafts a new plan's title, brief v1 and syllabus v1 from the form and the plan's material. */
export async function draftPlan(planId: string, input: WizardInput) {
  const userId = await requireUser()
  const answers = wizardInput.parse(input)
  const plan = await plans.getPlan(userId, planId)
  if (!plan)
    throw new Error('Not found')
  const limit = await reserveAiRequest(userId)
  if (limit)
    return { error: limit.error }
  const material = await getActiveMaterials(plan.id)
  const { output } = await generateText({
    model: await currentModel(),
    maxOutputTokens: AI_OUTPUT_TOKENS,
    output: Output.object({ schema: draft }),
    prompt: planDraftPrompt(answers, material),
    providerOptions: NO_THINKING,
  })
  await plans.writeDocVersion({ planId: plan.id, kind: 'brief', body: renderDoc('brief', output.brief), author: 'tutor', summary: 'First draft' })
  await plans.writeDocVersion({ planId: plan.id, kind: 'syllabus', body: renderDoc('syllabus', output.syllabus), author: 'tutor', summary: 'First draft' })
  if (!plan.title)
    await plans.renamePlan(userId, plan.id, output.title.trim().slice(0, 80) || null)
  return { error: null }
}

/** Renames a plan; an empty title clears it. */
export async function renamePlan(planId: string, title: string | null) {
  const userId = await requireUser()
  await plans.renamePlan(userId, planId, title?.trim().slice(0, 200) || null)
}

/** Moves a session into a plan, or back to Uncategorized with null. */
export async function movePlanSession(conversationId: string, planId: string | null) {
  const userId = await requireUser()
  if (!await getConversation(userId, conversationId))
    throw new Error('Not found')
  if (planId && !await plans.getPlan(userId, planId))
    throw new Error('Not found')
  await plans.setConversationPlan(userId, conversationId, planId)
}
