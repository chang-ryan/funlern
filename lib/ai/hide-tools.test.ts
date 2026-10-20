import type { UIMessageChunk } from 'ai'
import { describe, expect, it } from 'vitest'
import { hideTools } from './hide-tools'

async function run(chunks: UIMessageChunk[]) {
  const out: UIMessageChunk[] = []
  const reader = hideTools(new ReadableStream({ start: (c) => {
    chunks.forEach(chunk => c.enqueue(chunk))
    c.close()
  } })).getReader()
  for (let r = await reader.read(); !r.done; r = await reader.read())
    out.push(r.value)
  return out
}

describe('hideTools', () => {
  it('drops a hidden call and keeps everything else', async () => {
    const out = await run([
      { type: 'tool-input-start', toolCallId: 'q', toolName: 'create_quiz' },
      { type: 'tool-input-delta', toolCallId: 'q', inputTextDelta: '{"answer":2' },
      { type: 'tool-input-available', toolCallId: 'q', toolName: 'create_quiz', input: { answer: 2 } },
      { type: 'tool-output-error', toolCallId: 'q', errorText: 'no' },
      { type: 'tool-input-available', toolCallId: 'd', toolName: 'update_doc', input: {} },
      { type: 'text-delta', id: 't', delta: 'hi' },
    ])
    expect(out.map(c => c.type)).toEqual(['tool-input-available', 'text-delta'])
  })
})
