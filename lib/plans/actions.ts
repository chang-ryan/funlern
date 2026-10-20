'use server'

import type { WizardInput } from './wizard'
import { generateText, Output } from 'ai'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { currentModel } from '@/lib/ai/model'
import { planDraftPrompt } from '@/lib/ai/prompts/tasks/plan-draft'
import * as plans from '@/lib/db/plans'
import { getConversation } from '@/lib/db/queries'
import { getUserId } from '@/lib/supabase/server'
import { renderDoc } from './docs'
import { LEVELS, SERIOUSNESS } from './wizard'

async function requireUser() {
  const userId = await getUserId()
  if (!userId)
    redirect('/login')
  return userId
}

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

/** Creates a plan from the new-plan form: the tutor drafts its title, brief v1 and syllabus v1. */
export async function createPlan(input: WizardInput): Promise<{ planId: string }> {
  const userId = await requireUser()
  const answers = wizardInput.parse(input)
  const { output } = await generateText({
    model: await currentModel(),
    output: Output.object({ schema: draft }),
    prompt: planDraftPrompt(answers),
    providerOptions: { anthropic: { thinking: { type: 'disabled' } } },
  })
  const planId = await plans.createPlan(userId, output.title.trim().slice(0, 80) || null, [
    { kind: 'brief', body: renderDoc('brief', output.brief) },
    { kind: 'syllabus', body: renderDoc('syllabus', output.syllabus) },
  ])
  return { planId }
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
