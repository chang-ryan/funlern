'use client'

import type { ThreadData } from './types'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'
import { textOf } from '@/lib/messages'

export function Thread({ thread }: { thread: ThreadData }) {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport: new DefaultChatTransport({
      api: '/api/thread',
      prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, message: messages.at(-1) } }),
    }),
  })

  return (
    <section data-thread-id={thread.id}>
      <blockquote>{thread.anchor.quote}</blockquote>
      {messages.map(m => <div key={m.id}>{textOf(m)}</div>)}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!input.trim())
            return
          sendMessage({ text: input })
          setInput('')
        }}
      >
        <input value={input} onChange={e => setInput(e.target.value)} disabled={status !== 'ready'} />
      </form>
    </section>
  )
}
