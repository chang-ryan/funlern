'use client'

import type { UIMessage } from 'ai'
import type { ThreadData } from './types'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'
import { AssistantMessage } from './assistant-message'
import { ChatView } from './chat/chat-view'
import { ThreadRail } from './thread-rail'

/** Persisted conversation with side threads. */
export function Conversation({ id, initialMessages, initialThreads }: {
  id: string
  initialMessages: UIMessage[]
  initialThreads: ThreadData[]
}) {
  const [threads, setThreads] = useState(initialThreads)
  const { messages, sendMessage, status, error, stop } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, message: messages.at(-1) } }),
    }),
  })

  return (
    <ChatView
      messages={messages}
      status={status}
      error={error}
      onSend={text => sendMessage({ text })}
      onStop={stop}
      renderTutor={(m, index) => (
        <AssistantMessage
          conversationId={id}
          message={m}
          index={index}
          threads={threads.filter(t => t.anchorMessageId === m.id)}
          onThreadCreated={t => setThreads(ts => [...ts, { ...t, messages: [] }])}
        />
      )}
      aside={<ThreadRail threads={threads} />}
    />
  )
}
