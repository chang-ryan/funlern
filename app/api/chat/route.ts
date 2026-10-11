import type { UIMessage } from 'ai'
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, validateUIMessages } from 'ai'
import { model } from '@/lib/ai/model'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system'
import { getConversation, getMessages, saveMessages } from '@/lib/db/queries'
import { getUserId } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { id, message }: { id: string, message: UIMessage } = await req.json()
  const convo = await getConversation(userId, id)
  if (!convo)
    return new Response('Not found', { status: 404 })

  const messages = await validateUIMessages({ messages: [...await getMessages(id), message] })

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onEnd: ({ messages }) => saveMessages(id, messages),
    }),
  })
}
