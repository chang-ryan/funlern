import type { UIMessage } from 'ai'
import type { ProviderId } from '@/lib/ai/provider-ids'
import { convertToModelMessages, streamText } from 'ai'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { PROVIDER_IDS } from '@/lib/ai/provider-ids'
import { providers } from '@/lib/ai/providers'

// Dev-only, unpersisted chat for the UI preview on `/`. Model comes from DEV_* env vars.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production')
    return new Response('Not found', { status: 404 })

  const provider = process.env.DEV_PROVIDER as ProviderId | undefined
  const modelId = process.env.DEV_MODEL
  if (!provider || !PROVIDER_IDS.includes(provider) || !modelId)
    return new Response('Set DEV_PROVIDER, DEV_MODEL and DEV_API_KEY in .env.local to chat.', { status: 503 })

  const { messages }: { messages: UIMessage[] } = await req.json()
  const result = streamText({
    model: providers[provider](modelId, { apiKey: process.env.DEV_API_KEY, baseURL: process.env.DEV_BASE_URL || undefined }),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
}
