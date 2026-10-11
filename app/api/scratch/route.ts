import type { UIMessage } from 'ai'
import { convertToModelMessages, streamText } from 'ai'
import { model } from '@/lib/ai/model'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system'

// Dev-only, unpersisted chat for the UI preview on `/`.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production')
    return new Response('Not found', { status: 404 })
  if (!process.env.ANTHROPIC_API_KEY)
    return new Response('Set ANTHROPIC_API_KEY in .env.local to chat.', { status: 503 })

  const { messages }: { messages: UIMessage[] } = await req.json()
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
}
