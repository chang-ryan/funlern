import type { UIMessageChunk } from 'ai'

/** Calls the learner never sees and history never keeps: a create_quiz outside /quiz-me carries its answers. */
const HIDDEN_TOOLS = new Set(['create_quiz'])

/** Drops every chunk of a hidden tool's calls, so neither the learner nor the saved reply gets them. */
export function hideTools(stream: ReadableStream<UIMessageChunk>) {
  const hidden = new Set<string>()
  return stream.pipeThrough(new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if ('toolName' in chunk && HIDDEN_TOOLS.has(chunk.toolName))
        hidden.add(chunk.toolCallId)
      if (!('toolCallId' in chunk && hidden.has(chunk.toolCallId)))
        controller.enqueue(chunk)
    },
  }))
}
