import type { UIMessage } from 'ai'
import { createUIMessageStreamResponse, streamText, toUIMessageStream, validateUIMessages } from 'ai'
import { markCacheBreakpoint } from '@/lib/ai/cache'
import { toModelMessages } from '@/lib/ai/messages'
import { currentModel } from '@/lib/ai/model'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system'
import { threadFrame } from '@/lib/ai/prompts/turn'
import { finishMetadata, saveReplyWhenDone } from '@/lib/ai/reply'
import { TOOL_CHOICE, toolsFor } from '@/lib/ai/tools'
import { placeTurn } from '@/lib/ai/turn'
import { deleteThreadMessagesFrom, getMessages, getThread, getThreadMessages, saveThreadMessages } from '@/lib/db/queries'
import { textOf } from '@/lib/messages'
import { getUserId } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { id, message }: { id: string, message: UIMessage } = await req.json()
  const t = await getThread(userId, id)
  if (!t)
    return new Response('Not found', { status: 404 })

  // Frozen fork: main as it stood when the thread opened, then this thread's own turns.
  const prefix = await toModelMessages(await getMessages(t.conversationId, t.snapshotIndex))
  const turn = placeTurn(await getThreadMessages(id), message)
  const threadMessages = await validateUIMessages({ messages: [...turn.history, turn.message] })

  // Save the learner's question before calling the model, so a failed or dropped reply never loses it.
  if (turn.retry)
    await deleteThreadMessagesFrom(id, turn.dropFrom)
  await saveThreadMessages(id, threadMessages)

  // Stored thread messages keep the raw question; the model sees the first one framed with the quote.
  const [first, ...rest] = threadMessages
  const framed: UIMessage = { ...first, parts: [{ type: 'text', text: threadFrame(t.anchor, textOf(first)) }] }
  const own = await toModelMessages([framed, ...rest])

  const result = streamText({
    model: await currentModel(),
    system: SYSTEM_PROMPT,
    tools: toolsFor({ userId, conversationId: t.conversationId }),
    toolChoice: TOOL_CHOICE,
    // Breakpoint 1 reuses main's cache; breakpoint 2 caches this thread for its next reply.
    messages: markCacheBreakpoint(markCacheBreakpoint([...prefix, ...own], prefix.length - 1), prefix.length + own.length - 1),
  })
  const replyId = saveReplyWhenDone(result.stream, reply => saveThreadMessages(id, [...threadMessages, reply]))

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: threadMessages,
      generateMessageId: () => replyId,
      messageMetadata: finishMetadata,
    }),
  })
}
