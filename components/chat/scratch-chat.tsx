'use client'

import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ChatView } from './chat-view'

const SEED: UIMessage[] = [
  { id: 'seed-1', role: 'assistant', parts: [{ type: 'text', text: 'Hi! What do you want to learn today?' }] },
  { id: 'seed-2', role: 'user', parts: [{ type: 'text', text: 'Explain React Redux to me.' }] },
  {
    id: 'seed-3',
    role: 'assistant',
    parts: [{
      type: 'text',
      text: 'Redux keeps your app\'s state in **one store**. Components never change it directly; they **dispatch actions**, and **reducers** compute the next state.\n\n- `useSelector` reads from the store\n- `useDispatch` sends actions\n\nWant to start with the store, or with how a component connects to it?',
    }],
  },
]

/** Unpersisted chat for trying the UI. Talks to /api/scratch. */
export function ScratchChat() {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    messages: SEED,
    transport: new DefaultChatTransport({ api: '/api/scratch' }),
  })

  return (
    <ChatView
      messages={messages}
      status={status}
      error={error}
      onSend={text => sendMessage({ text })}
      onStop={stop}
      header={(
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <span className="font-semibold tracking-tight">funlern</span>
            <button type="button" onClick={() => setMessages([SEED[0]])} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-tutor">
              New chat
            </button>
          </div>
        </header>
      )}
    />
  )
}
