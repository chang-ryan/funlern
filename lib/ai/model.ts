import { anthropic } from '@ai-sdk/anthropic'
import { cookies } from 'next/headers'
import { isModelId, MODEL_COOKIE } from './models'
import 'server-only'

// POC runs on Claude only (reads ANTHROPIC_API_KEY). Bring-your-own models come later.
const DEFAULT_MODEL_ID = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'

/** The learner's pick from the model cookie, or the default when it's missing or not one we offer. */
export async function currentModelId() {
  const picked = (await cookies()).get(MODEL_COOKIE)?.value
  return isModelId(picked) ? picked : DEFAULT_MODEL_ID
}

export async function currentModel() {
  return anthropic(await currentModelId())
}
