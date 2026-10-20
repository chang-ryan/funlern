'use client'

import type { ChatStatus, UIMessage } from 'ai'
import type { MouseEventHandler, PointerEventHandler, ReactNode, Ref } from 'react'
import { useEffect, useRef, useState } from 'react'
import { replyProblem } from '@/lib/ai/turn'
import { COMMANDS } from '@/lib/commands'
import { awaitingText, hasContent } from '@/lib/messages'
import { Composer } from './composer'
import { Message, Typing } from './message'
import { ModelPicker } from './model-picker'
import { ReplyProblem } from './reply-problem'

/** Presentational chat: scrolling transcript + composer. State lives in the caller's useChat. */
export function ChatView({ messages, status, error, onSend, onStop, onRetry, model, blocked, header, renderTutor, rail, overlay, transcriptRef, onTranscriptClick, onTranscriptPointerMove }: {
  messages: UIMessage[]
  status: ChatStatus
  error?: Error
  onSend: (text: string) => void
  onStop?: () => void
  /** Asks for the last reply again, after an error or a cut-off reply. */
  onRetry?: () => void
  /** Model the next turn goes to; the learner can switch it under the composer. */
  model?: string
  /** Why the learner can't send right now, e.g. a quiz waiting to be finished. */
  blocked?: string
  header?: ReactNode
  renderTutor?: (message: UIMessage, index: number, streaming: boolean) => ReactNode
  /** Desktop column beside the transcript; scrolls with it. */
  rail?: ReactNode
  /** Fixed-position UI: popovers, drawers. */
  overlay?: ReactNode
  transcriptRef?: Ref<HTMLDivElement>
  onTranscriptClick?: MouseEventHandler<HTMLDivElement>
  onTranscriptPointerMove?: PointerEventHandler<HTMLDivElement>
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const busy = status === 'submitted' || status === 'streaming'
  const problem = replyProblem(messages, error)
  const waiting = awaitingText(messages, busy)
  const last = messages.at(-1)
  const width = rail ? 'max-w-3xl lg:max-w-[calc(48rem+var(--spacing-rail)+2rem)]' : 'max-w-3xl'

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, status])

  // Show the jump-to-bottom button once the reader is scrolled up, rechecking as content grows.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el)
      return
    // Stays pinned to the bottom while the reader is there, so content that grows after it renders (a quiz
    // card loading, an explanation appearing) doesn't end up under the composer.
    let pinned = true
    const check = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      pinned = gap < 40
      setAwayFromBottom(gap > 200)
    }
    const ro = new ResizeObserver(() => {
      if (pinned)
        el.scrollTop = el.scrollHeight
      check()
    })
    ro.observe(el)
    ro.observe(el.firstElementChild!)
    el.addEventListener('scroll', check, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', check)
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`mx-auto flex gap-8 px-4 py-6 ${width}`}>
          <div ref={transcriptRef} onClick={onTranscriptClick} onPointerMove={onTranscriptPointerMove} className="flex min-w-0 flex-1 flex-col gap-5">
            {messages.map((m, i) => {
              // The reply-to-be stays hidden behind the typing dots until it has something to show.
              if (waiting && m === last && m.role === 'assistant' && !hasContent(m))
                return null
              const streaming = status === 'streaming' && m === last
              return (
                <Message key={m.id} message={m} streaming={streaming}>
                  {m.role === 'assistant' ? renderTutor?.(m, i, streaming) : undefined}
                </Message>
              )
            })}
            {waiting && <Typing />}
            {problem && !busy && <ReplyProblem text={problem} onRetry={onRetry} />}
            <div ref={endRef} />
          </div>
          {rail}
        </div>
      </div>
      <div className={`mx-auto flex w-full gap-8 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] ${width}`}>
        <div className="relative min-w-0 flex-1">
          {/* Always mounted so it can fade both ways; hidden from clicks and focus while faded out. */}
          <button
            type="button"
            aria-label="Scroll to bottom"
            aria-hidden={!awayFromBottom}
            tabIndex={awayFromBottom ? undefined : -1}
            onClick={() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })}
            className={`absolute bottom-full left-1/2 mb-3 flex size-10 -translate-x-1/2 items-center justify-center rounded-full border border-muted/40 bg-surface text-foreground shadow-lg transition-opacity duration-200 hover:bg-tutor ${awayFromBottom ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
              <path d="M10 4v12M5 11l5 5 5-5" />
            </svg>
          </button>
          <Composer onSend={onSend} onStop={onStop} busy={busy} commands={COMMANDS} disabledReason={blocked} />
          {model && <ModelPicker initial={model} />}
        </div>
        {rail && <div className="hidden w-rail shrink-0 lg:block" />}
      </div>
      {overlay}
    </div>
  )
}
