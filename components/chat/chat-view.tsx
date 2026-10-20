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
export function ChatView({ messages, status, error, onSend, onStop, onRetry, model, session, top, suggestions, blocked, header, renderTutor, rail, overlay, transcriptRef, onTranscriptClick, onTranscriptPointerMove }: {
  messages: UIMessage[]
  status: ChatStatus
  error?: Error
  onSend: (text: string) => void
  onStop?: () => void
  /** Asks for the last reply again, after an error or a cut-off reply. */
  onRetry?: () => void
  /** Model the next turn goes to; the learner can switch it under the composer. */
  model?: string
  /** Beside the model picker: the session's mode, when it isn't plain learning. */
  session?: ReactNode
  /** A panel under the header that stays put while the transcript scrolls beneath it (mission control). */
  top?: ReactNode
  /** Suggested messages on the composer, sent in one click. Off unless given; mission control turns them on. */
  suggestions?: { items: string[], onPick: (text: string) => void }
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
  // Floating suggestions need the transcript fully scrolled down, or they'd sit over text.
  const [atBottom, setAtBottom] = useState(true)
  // Suggestions float over the end of the transcript; a spacer of their height keeps the last message clear of them.
  const pillsRef = useRef<HTMLDivElement>(null)
  const [pillsHeight, setPillsHeight] = useState(0)
  const hasPills = !!suggestions?.items.length
  // With suggestions, the arrow takes their place as soon as they fade; without, it waits until the reader is well up.
  const showPills = hasPills && atBottom
  const showArrow = hasPills ? !atBottom : awayFromBottom
  useEffect(() => {
    const el = pillsRef.current
    if (!el)
      return
    // The spacer grows after the transcript has scrolled down on load; follow it if the reader was at the bottom.
    const observer = new ResizeObserver(() => {
      const scroller = scrollerRef.current
      const wasAtBottom = !!scroller && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40
      setPillsHeight(el.offsetHeight)
      if (wasAtBottom)
        requestAnimationFrame(() => scroller.scrollTo({ top: scroller.scrollHeight }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasPills])
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
      setAtBottom(gap < 8)
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
      {top && (
        <div className="shrink-0 border-b border-border">
          <div className={`mx-auto px-4 pt-2 pb-4 ${width}`}>{top}</div>
        </div>
      )}
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
            {hasPills && <div aria-hidden style={{ height: pillsHeight }} className="shrink-0" />}
            <div ref={endRef} />
          </div>
          {rail}
        </div>
      </div>
      <div className={`mx-auto flex w-full gap-8 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] ${width}`}>
        <div className="relative min-w-0 flex-1">
          {/* Suggested messages float on the composer while the reader is at the bottom; scrolling up swaps them for the arrow. */}
          <div className="relative">
            {suggestions && hasPills && (
              <div
                ref={pillsRef}
                aria-hidden={!showPills}
                className={`absolute inset-x-0 bottom-full flex flex-wrap gap-2 pb-2 transition-opacity duration-200 ${showPills ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
              >
                {suggestions.items.map(s => (
                  <button
                    key={s}
                    type="button"
                    tabIndex={showPills ? undefined : -1}
                    disabled={busy || !!blocked}
                    onClick={() => suggestions.onPick(s)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-sm shadow-sm hover:bg-tutor disabled:opacity-50 disabled:hover:bg-background"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {/* Always mounted so it can fade both ways; hidden from clicks and focus while faded out. */}
            <button
              type="button"
              aria-label="Scroll to bottom"
              aria-hidden={!showArrow}
              tabIndex={showArrow ? undefined : -1}
              onClick={() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })}
              className={`absolute left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-full border border-muted/40 bg-surface text-foreground shadow-lg transition-opacity duration-200 hover:bg-tutor bottom-full mb-3 ${showArrow ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
                <path d="M10 4v12M5 11l5 5 5-5" />
              </svg>
            </button>
          </div>
          <Composer onSend={onSend} onStop={onStop} busy={busy} commands={COMMANDS} disabledReason={blocked} />
          <div className="flex items-center gap-3">
            {model && <ModelPicker initial={model} />}
            {session}
          </div>
        </div>
        {rail && <div className="hidden w-rail shrink-0 lg:block" />}
      </div>
      {overlay}
    </div>
  )
}
