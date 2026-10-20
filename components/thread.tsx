'use client'

import type { Chat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import type { ReactNode } from 'react'
import type { ThreadData } from './types'
import { useChat } from '@ai-sdk/react'
import { useState } from 'react'
import { replyProblem } from '@/lib/ai/turn'
import { awaitingText, textOf } from '@/lib/messages'
import { Composer } from './chat/composer'
import { CopyButton } from './chat/copy-button'
import { ReplyProblem } from './chat/reply-problem'
import { TutorAvatar } from './chat/tutor-avatar'
import { TutorMarkdown } from './chat/tutor-markdown'

/**
 * A side thread, like a comment thread: the quoted passage, the back and forth, and a reply box.
 * Collapsed shows only the quote and a reply count. `focused` marks the thread the reader is on;
 * it is exposed as `data-focused` so its look can change without touching this component's logic.
 */
export function ThreadCard({ thread, chat, focused = false, collapsed = false, onFocus, onToggle }: {
  thread: ThreadData
  /** Owned by the conversation, so the thread keeps its state when it moves between rail and drawer. */
  chat: Chat<UIMessage>
  focused?: boolean
  collapsed?: boolean
  onFocus?: () => void
  /** Omit to make the card always expanded (e.g. in the mobile drawer). */
  onToggle?: () => void
}) {
  const { messages, sendMessage, regenerate, status, error } = useChat({ chat })
  const busy = status === 'submitted' || status === 'streaming'
  const problem = replyProblem(messages, error)
  const waiting = awaitingText(messages, busy)
  const replies = messages.filter(m => m.role === 'assistant').length

  return (
    <section
      data-thread-id={thread.id}
      data-focused={focused || undefined}
      data-collapsed={collapsed || undefined}
      onClick={onFocus}
      className="group/thread flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 text-sm shadow-sm transition-colors data-focused:border-muted"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Quote text={thread.anchor.quote} lines={collapsed ? 1 : 3} />
        </div>
        {onToggle && (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="shrink-0 text-muted hover:text-foreground"
          >
            <span className={`inline-block transition-transform ${collapsed ? '' : 'rotate-90'}`}>›</span>
          </button>
        )}
      </div>

      {collapsed
        ? (
            <button type="button" onClick={onToggle} className="self-start text-xs text-muted hover:text-foreground">
              {busy ? 'Replying…' : `${replies} ${replies === 1 ? 'reply' : 'replies'}`}
            </button>
          )
        : (
            <>
              {messages.map((m) => {
                if (m.role === 'user')
                  return <Turn key={m.id} who="learner"><p className="whitespace-pre-wrap">{textOf(m)}</p></Turn>
                if (waiting && m === messages.at(-1))
                  return null
                const streaming = busy && m === messages.at(-1)
                return (
                  <Turn key={m.id} who="tutor">
                    <TutorMarkdown text={textOf(m)} streaming={streaming} className="text-sm leading-relaxed text-foreground/90" />
                    {!streaming && <div className="-ml-1.5"><CopyButton text={textOf(m)} /></div>}
                  </Turn>
                )
              })}
              {waiting && <Turn who="tutor"><p className="text-muted">Thinking…</p></Turn>}
              {problem && !busy && <ReplyProblem text={problem} onRetry={() => regenerate()} />}
              <Composer onSend={text => sendMessage({ text })} busy={busy} placeholder="Reply…" />
            </>
          )}
    </section>
  )
}

/**
 * Composer for a thread that doesn't exist yet; the thread is saved on the first question. Once asked,
 * the question and "Thinking…" show right away, while the thread is created, so the card never goes blank.
 */
export function NewThreadCard({ quote, onAsk, onCancel }: {
  quote: string
  onAsk: (question: string) => Promise<void>
  onCancel: () => void
}) {
  const [asked, setAsked] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  async function ask(question: string) {
    setAsked(question)
    setFailed(null)
    try {
      await onAsk(question)
    }
    catch {
      setAsked(null)
      setFailed(question)
    }
  }

  return (
    <section data-draft-thread className="flex flex-col gap-3 rounded-xl border border-muted bg-surface p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Quote text={quote} />
        {!asked && <button type="button" onClick={onCancel} aria-label="Cancel" className="text-muted hover:text-foreground">✕</button>}
      </div>
      {asked
        ? (
            <>
              <Turn who="learner"><p className="whitespace-pre-wrap">{asked}</p></Turn>
              <Turn who="tutor"><p className="text-muted">Thinking…</p></Turn>
            </>
          )
        : (
            <>
              {failed && <p role="alert" className="text-muted">Couldn't start the thread. Try again.</p>}
              <Composer key={failed ?? ''} initialText={failed ?? ''} onSend={ask} placeholder="Ask about this…" autoFocus />
            </>
          )}
    </section>
  )
}

/** One message in a thread, under a Learner or Tutor header. */
function Turn({ who, children }: { who: 'learner' | 'tutor', children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {who === 'tutor' && <TutorAvatar size={18} />}
        {who === 'tutor' ? 'Tutor' : 'Learner'}
      </div>
      {children}
    </div>
  )
}

function Quote({ text, lines = 3 }: { text: string, lines?: 1 | 3 }) {
  return <p className={`${lines === 1 ? 'line-clamp-1' : 'line-clamp-3'} border-l-2 border-yellow-400 pl-2 text-muted italic`}>{text}</p>
}
