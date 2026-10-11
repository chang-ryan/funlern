'use client'

import type { ChatStatus, UIMessage } from 'ai'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Composer } from './composer'
import { Message, Typing } from './message'

/** Presentational chat: scrolling transcript + composer. State lives in the caller's useChat. */
export function ChatView({ messages, status, error, onSend, onStop, header, renderTutor, aside }: {
  messages: UIMessage[]
  status: ChatStatus
  error?: Error
  onSend: (text: string) => void
  onStop?: () => void
  header?: ReactNode
  renderTutor?: (message: UIMessage, index: number) => ReactNode
  aside?: ReactNode
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'
  const last = messages.at(-1)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, status])

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.map((m, i) => (
              <Message key={m.id} message={m} streaming={status === 'streaming' && m === last}>
                {m.role === 'assistant' ? renderTutor?.(m, i) : undefined}
              </Message>
            ))}
            {status === 'submitted' && <Typing />}
            {error && (
              <p role="alert" className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                {error.message || 'Something went wrong.'}
              </p>
            )}
            <div ref={endRef} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Composer onSend={onSend} onStop={onStop} busy={busy} />
        </div>
      </div>
      {aside}
    </div>
  )
}
