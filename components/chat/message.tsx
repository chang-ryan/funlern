import type { UIMessage } from 'ai'
import type { ReactNode } from 'react'
import { Streamdown } from 'streamdown'
import { textOf } from '@/lib/messages'

/** Tutor (assistant) messages sit left, student (user) messages sit right. */
export function Message({ message, streaming, children }: {
  message: UIMessage
  streaming?: boolean
  children?: ReactNode
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-student px-4 py-2.5 text-student-foreground sm:max-w-[75%]">
          {textOf(message)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <div aria-hidden className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-medium text-muted">
        T
      </div>
      <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-md bg-tutor px-4 py-2.5 sm:max-w-[80%]">
        {children ?? (
          <Streamdown className="text-[15px] leading-relaxed" isAnimating={streaming}>
            {textOf(message)}
          </Streamdown>
        )}
      </div>
    </div>
  )
}

export function Typing() {
  return (
    <div className="flex items-start gap-2.5" aria-label="Tutor is typing">
      <div aria-hidden className="mt-1 size-7 shrink-0 rounded-full border border-border bg-surface" />
      <div className="flex gap-1 rounded-2xl rounded-tl-md bg-tutor px-4 py-3.5">
        {[0, 150, 300].map(d => (
          <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}
