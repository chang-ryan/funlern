import type { LanguageModel } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { cookies } from 'next/headers'
import { mockModel } from './mock-model'
import { isModelId, MODEL_COOKIE } from './models'
import 'server-only'

// POC runs on Claude only (reads ANTHROPIC_API_KEY). Bring-your-own models come later.
const DEFAULT_MODEL_ID = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'

// Side tasks (titles, transcription) always use the fast model, whatever the learner picked for the tutor.
const TASK_MODEL_ID = 'claude-haiku-5-5'

// Forcing a tool or a structured output doesn't work with thinking on, and side tasks don't need it.
export const NO_THINKING = { anthropic: { thinking: { type: 'disabled' as const } } }

// MOCK_MODEL=1 swaps every model for a scripted one, so the smoke test checks structure without calling Claude.
// Never in production.
const MOCKED = process.env.MOCK_MODEL === '1' && process.env.NODE_ENV !== 'production'

function model(id: string): LanguageModel {
  return MOCKED ? mockModel(id) : anthropic(id)
}

/** The learner's pick from the model cookie, or the default when it's missing or not one we offer. */
export async function currentModelId() {
  const picked = (await cookies()).get(MODEL_COOKIE)?.value
  return isModelId(picked) ? picked : DEFAULT_MODEL_ID
}

/** The tutor's model: the learner's pick. */
export async function currentModel() {
  return model(await currentModelId())
}

/** The model for side tasks: titles, transcription. */
export function taskModel() {
  return model(TASK_MODEL_ID)
}
