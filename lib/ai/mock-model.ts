import type { LanguageModelV4CallOptions, LanguageModelV4Content, LanguageModelV4StreamPart } from '@ai-sdk/provider'
import { MockLanguageModelV4 } from 'ai/test'
import 'server-only'

/**
 * A scripted model for the smoke test (MOCK_MODEL=1). It answers by what the request asks for, never by
 * meaning, so the test checks what the server sends and saves rather than what a model says:
 * - a structured output (plan draft, title) gets valid JSON for its schema;
 * - a forced create_quiz gets a fixed two-question quiz;
 * - a PDF gets a one-page transcription;
 * - each `[mock:tool NAME {json}]` in the learner's message calls that tool, then it replies "done" after the results;
 * - `[mock:echo]` replies with the whole request as the model saw it (system prompt and messages), so the
 *   test can check context: what the plan block holds, what was folded in;
 * - anything else gets "Mock reply.".
 */
export function mockModel(modelId: string) {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId,
    doGenerate: async options => ({ ...finish(respond(options)), warnings: [] }),
    doStream: async options => ({ stream: toStream(finish(respond(options))) }),
  })
}

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

const QUIZ = {
  title: 'Mock quiz',
  questions: [
    { question: 'Mock question one?', choices: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'Because b.' },
    { question: 'Mock question two?', choices: ['e', 'f', 'g', 'h'], answer: 2, explanation: 'Because g.' },
  ],
}

function finish(content: LanguageModelV4Content[]) {
  const toolCall = content.some(c => c.type === 'tool-call')
  return { content, usage: USAGE, finishReason: { unified: toolCall ? 'tool-calls' as const : 'stop' as const, raw: undefined } }
}

const text = (value: string): LanguageModelV4Content[] => [{ type: 'text', text: value }]
const call = (toolName: string, input: unknown): LanguageModelV4Content[] => [{ type: 'tool-call', toolCallId: `mock-${crypto.randomUUID()}`, toolName, input: JSON.stringify(input) }]

function respond(options: LanguageModelV4CallOptions): LanguageModelV4Content[] {
  const { prompt, responseFormat, toolChoice } = options
  if (responseFormat?.type === 'json')
    return text(JSON.stringify(jsonFor(responseFormat.schema)))
  if (toolChoice?.type === 'tool' && toolChoice.toolName === 'create_quiz')
    return call('create_quiz', QUIZ)

  const last = prompt.at(-1)
  // After a tool result the model goes on; one short line is enough.
  if (last?.role === 'tool')
    return text('done')
  const parts = last?.role === 'user' ? last.content : []
  if (parts.some(p => p.type === 'file'))
    return text('[page 1]\n\nMock transcription of a page with no text layer.')
  const said = parts.map(p => (p.type === 'text' ? p.text : '')).join('\n')

  const tools = [...said.matchAll(/\[mock:tool (\w+) (\{[\s\S]*?\})\]/g)]
  if (tools.length && toolChoice?.type !== 'none')
    return tools.flatMap(([, name, input]) => call(name, JSON.parse(input)))
  if (said.includes('[mock:echo]'))
    return text(JSON.stringify(prompt))
  return text('Mock reply.')
}

/** Valid output for the structured calls we make: the plan draft (brief + syllabus) or a title. */
function jsonFor(schema: unknown) {
  const keys = Object.keys((schema as { properties?: object } | undefined)?.properties ?? {})
  if (keys.includes('brief')) {
    return {
      title: 'Mock plan',
      brief: { Goal: 'Mock goal.', Why: 'Mock reason.', Level: 'Mock level.', Seriousness: 'Mock seriousness.', Constraints: '' },
      syllabus: { Units: '- [ ] Mock unit one: first\n- [ ] Mock unit two: second', Notes: '' },
    }
  }
  return { title: 'Mock title' }
}

function toStream({ content, usage, finishReason }: ReturnType<typeof finish>) {
  const parts: LanguageModelV4StreamPart[] = [{ type: 'stream-start', warnings: [] }]
  for (const c of content) {
    if (c.type === 'text') {
      parts.push({ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: c.text }, { type: 'text-end', id: 't' })
    }
    else if (c.type === 'tool-call') {
      parts.push(c)
    }
  }
  parts.push({ type: 'finish', usage, finishReason })
  return new ReadableStream<LanguageModelV4StreamPart>({
    start(controller) {
      for (const part of parts) controller.enqueue(part)
      controller.close()
    },
  })
}
