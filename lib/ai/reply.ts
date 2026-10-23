import type { TextStreamPart, ToolSet, UIMessage } from 'ai'
import { generateId, readUIMessageStream, toUIMessageStream } from 'ai'
import { after } from 'next/server'
import { logError } from '@/lib/log'
import { hideTools } from './hide-tools'
import { stampFinish } from './turn'

/** Sends each reply's finish reason to the client, and into the saved message, as metadata. */
export function finishMetadata({ part }: { part: TextStreamPart<ToolSet> }) {
  return part.type === 'finish' ? { finishReason: part.finishReason } : undefined
}

/**
 * Builds the reply from the server's own copy of the model stream. The client's copy is cancelled when
 * its connection drops, so the reply is saved from this one instead: it always runs to the end.
 * Resolves to the reply, stamped with how it ended ('unknown' if the model stream itself broke).
 */
async function collectReply(stream: ReadableStream<TextStreamPart<ToolSet>>, id: string, context: Record<string, unknown>): Promise<UIMessage | undefined> {
  let reply: UIMessage | undefined
  try {
    const uiStream = hideTools(toUIMessageStream({ stream, generateMessageId: () => id, messageMetadata: finishMetadata }))
    for await (const message of readUIMessageStream({ stream: uiStream }))
      reply = message
  }
  catch (error) {
    logError('reply stream failed', error, context)
  }
  return reply && stampFinish([reply], (reply.metadata as { finishReason?: string } | undefined)?.finishReason)[0]
}

/**
 * Saves the reply once it finishes, from the server's own copy of the stream, so a dropped connection
 * can't lose it; after() keeps the function alive until it is saved. Returns the reply's id, which the
 * client's copy of the stream must use too.
 */
export function saveReplyWhenDone(stream: ReadableStream<TextStreamPart<ToolSet>>, save: (reply: UIMessage) => Promise<unknown>, context: Record<string, unknown> = {}) {
  const id = generateId()
  after(collectReply(stream, id, context).then(reply => reply && save(reply)).catch(error => logError('reply save failed', error, context)))
  return id
}
