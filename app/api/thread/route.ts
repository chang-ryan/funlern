import type { UIMessage } from 'ai'
import { createUIMessageStreamResponse, stepCountIs, streamText, toUIMessageStream, validateUIMessages } from 'ai'
import { markCacheBreakpoint } from '@/lib/ai/cache'
import { hideTools } from '@/lib/ai/hide-tools'
import { AI_OUTPUT_TOKENS } from '@/lib/ai/limits'
import { toModelMessages } from '@/lib/ai/messages'
import { currentModel } from '@/lib/ai/model'
import { threadFrame } from '@/lib/ai/prompts/turn'
import { finishMetadata, saveReplyWhenDone } from '@/lib/ai/reply'
import { systemFor } from '@/lib/ai/system'
import { toolChoiceFor, toolsFor } from '@/lib/ai/tools'
import { placeTurn } from '@/lib/ai/turn'
import { NOT_FOUND, UNAUTHORIZED } from '@/lib/auth'
import { aiLimitResponse, reserveAiRequest } from '@/lib/db/ai-usage'
import { deleteThreadMessagesFrom, getConversation, getMessages, getThread, getThreadMessages, saveThreadMessages } from '@/lib/db/queries'
import { stampSent, textOf } from '@/lib/messages'
import { getUserId } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return UNAUTHORIZED()

  const { id, message }: { id: string, message: UIMessage } = await req.json()
  if (message.role !== 'user')
    return Response.json({ error: 'Only learner messages.' }, { status: 400 })
  const t = await getThread(userId, id)
  if (!t)
    return NOT_FOUND()

  // Frozen fork: main as it stood when the thread opened, then this thread's own turns.
  const prefix = await toModelMessages(await getMessages(t.conversationId, t.snapshotIndex))
  const turn = placeTurn(await getThreadMessages(id), message)
  const threadMessages = await validateUIMessages({ messages: [...turn.history, turn.retry ? turn.message : stampSent(turn.message)] })

  const limit = await reserveAiRequest(userId)
  if (limit)
    return aiLimitResponse(limit)

  // Save the learner's question before calling the model, so a failed or dropped reply never loses it.
  if (turn.retry)
    await deleteThreadMessagesFrom(id, turn.dropFrom)
  await saveThreadMessages(id, threadMessages)

  // Stored thread messages keep the raw question; the model sees the first one framed with the quote.
  const [first, ...rest] = threadMessages
  const framed: UIMessage = { ...first, parts: [{ type: 'text', text: threadFrame(t.anchor, textOf(first)) }] }
  const own = await toModelMessages([framed, ...rest])

  const convo = await getConversation(userId, t.conversationId)
  const result = streamText({
    model: await currentModel(),
    maxOutputTokens: AI_OUTPUT_TOKENS,
    // Same system prompt as main, so the frozen prefix reuses main's cache.
    system: await systemFor(convo!),
    tools: toolsFor({ userId, conversationId: t.conversationId, planId: convo!.planId, mode: convo!.mode }),
    toolChoice: toolChoiceFor(convo!),
    stopWhen: stepCountIs(4),
    // Breakpoint 1 reuses main's cache; breakpoint 2 caches this thread for its next reply.
    messages: markCacheBreakpoint(markCacheBreakpoint([...prefix, ...own], prefix.length - 1), prefix.length + own.length - 1),
  })
  const replyId = saveReplyWhenDone(result.stream, reply => saveThreadMessages(id, [...threadMessages, reply]))

  return createUIMessageStreamResponse({
    stream: hideTools(toUIMessageStream({
      stream: result.stream,
      originalMessages: threadMessages,
      generateMessageId: () => replyId,
      messageMetadata: finishMetadata,
    })),
  })
}
