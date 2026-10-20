'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { renameConversation } from '@/app/actions'

const UNTITLED = 'Untitled conversation'

/**
 * Top bar: sidebar toggle (placeholder until the drawer exists), home link, and the title, which turns into a
 * text field on click. A chat that isn't saved yet has nothing to rename, so its title is plain text.
 */
export function ConversationHeader({ id, title, setTitle, saved }: {
  id: string
  /** Held by the conversation, which also receives the generated title. */
  title: string | null
  setTitle: (title: string | null) => void
  saved: boolean
}) {
  const [editing, setEditing] = useState(false)

  async function save(next: string) {
    setEditing(false)
    const value = next.trim() || null
    if (value === title)
      return
    const previous = title
    setTitle(value)
    try {
      await renameConversation(id, value)
    }
    catch {
      setTitle(previous)
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 px-2 text-sm">
      <button type="button" aria-label="Open sidebar" className="rounded-lg p-2 text-muted hover:bg-tutor hover:text-foreground">
        <SidebarIcon />
      </button>
      <Link href="/" className="rounded-lg px-2 py-1.5 text-muted hover:bg-tutor hover:text-foreground">funlern</Link>
      <span aria-hidden className="text-muted/60">/</span>

      {!saved
        ? <span className="px-2 py-1.5 text-muted">New chat</span>
        : editing
          ? <TitleInput initial={title ?? ''} onDone={save} onCancel={() => setEditing(false)} />
          : (
              <button
                type="button"
                title="Rename"
                onClick={() => setEditing(true)}
                className={`min-w-0 truncate rounded-lg px-2 py-1.5 hover:bg-tutor ${title ? '' : 'text-muted'}`}
              >
                {title ?? UNTITLED}
              </button>
            )}
    </header>
  )
}

function TitleInput({ initial, onDone, onCancel }: { initial: string, onDone: (value: string) => void, onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  // Escape must not also save on the blur that follows.
  const cancelledRef = useRef(false)

  useEffect(() => {
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      aria-label="Conversation title"
      defaultValue={initial}
      placeholder={UNTITLED}
      maxLength={200}
      autoFocus
      onBlur={e => cancelledRef.current ? onCancel() : onDone(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter')
          e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelledRef.current = true
          e.currentTarget.blur()
        }
      }}
      className="w-72 max-w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-1 outline-none focus:border-muted"
    />
  )
}

function SidebarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-[18px]" aria-hidden>
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
      <path d="M7.5 3.75v12.5" />
    </svg>
  )
}
