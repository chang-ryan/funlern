import type { UIMessage } from 'ai'
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, validateUIMessages } from 'ai'
import { markCacheBreakpoint } from '@/lib/ai/cache'
import { model } from '@/lib/ai/model'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system'
import { threadFrame } from '@/lib/ai/prompts/turn'
import { getMessages, getThread, getThreadMessages, saveThreadMessages } from '@/lib/db/queries'
import { getUserId } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { id, message }: { id: string, message: UIMessage } = await req.json()
  const t = await getThread(userId, id)
  if (!t)
    return new Response('Not found', { status: 404 })

  // Frozen fork: main messages up to the snapshot, then this thread's own turns.
  const prefix = await getMessages(t.conversationId, t.snapshotIndex)
  const threadMessages = await validateUIMessages({ messages: [...await getThreadMessages(id), message] })

  // Stored thread messages keep the raw question; the model sees the first one framed with the quote.
  const [first, ...rest] = threadMessages
  const question = first.parts.map(p => (p.type === 'text' ? p.text : '')).join('')
  const framed: UIMessage = { ...first, parts: [{ type: 'text', text: threadFrame(t.anchor, question) }] }

  const prefixModel = await convertToModelMessages(prefix)

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      ...markCacheBreakpoint(prefixModel, prefixModel.length - 1),
      ...await convertToModelMessages([framed, ...rest]),
    ],
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: threadMessages,
      onEnd: ({ messages }) => saveThreadMessages(id, messages),
    }),
  })
}
