'use client'

import { useEffect, useRef, useState } from 'react'
import { renameConversation } from '@/app/actions'
import { peekPendingStart } from '@/lib/pending-start'
import { setSessionHead, useSessionHead } from '@/lib/session-heads'
import { Breadcrumbs, Crumb, CrumbLink } from './breadcrumbs'
import { UNTITLED_PLAN } from './plan/format'

const UNTITLED = 'Untitled conversation'

/**
 * A session's crumbs: its plan, then its title, which turns into a text field on click. A session that isn't
 * saved yet has nothing to rename, so its title is plain text; one started from the plan hub shows that plan
 * already. The title follows the conversation, which learns the generated one mid-reply.
 */
export function ConversationCrumbs({ id, loaded, plan: loadedPlan }: {
  id: string
  /** As the page loaded it: an unsaved session is untitled. */
  loaded: { title: string | null, saved: boolean }
  plan?: { id: string, title: string | null }
}) {
  const { title, saved } = useSessionHead(id, loaded)
  const [plan] = useState(() => loadedPlan ?? peekPendingStart(id)?.plan)
  const [editing, setEditing] = useState(false)
  const setTitle = (value: string | null) => setSessionHead(id, { title: value })

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
    <Breadcrumbs>
      {plan && <CrumbLink href={`/p/${plan.id}`}>{plan.title ?? UNTITLED_PLAN}</CrumbLink>}
      {!saved
        ? <Crumb muted>{title ?? 'New chat'}</Crumb>
        : (
            <Crumb bare>
              {editing
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
            </Crumb>
          )}
    </Breadcrumbs>
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
