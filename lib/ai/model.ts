import { anthropic } from '@ai-sdk/anthropic'
import 'server-only'

// POC runs on Claude only (reads ANTHROPIC_API_KEY). Bring-your-own models come later.
export const model = anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5')
