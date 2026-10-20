'use client'

import { useEffect, useRef, useState } from 'react'
import { renamePlan } from '@/lib/plans/actions'
import { UNTITLED_PLAN } from './format'

/** The plan's heading; turns into a text field on click, like the conversation title. */
export function PlanTitle({ planId, initial }: { planId: string, initial: string | null }) {
  const [title, setTitle] = useState(initial)
  const [editing, setEditing] = useState(false)

  async function save(next: string) {
    setEditing(false)
    const value = next.trim() || null
    if (value === title)
      return
    const previous = title
    setTitle(value)
    try {
      await renamePlan(planId, value)
    }
    catch {
      setTitle(previous)
    }
  }

  if (editing)
    return <TitleInput initial={title ?? ''} onDone={save} onCancel={() => setEditing(false)} />
  return (
    <h1>
      <button
        type="button"
        title="Rename"
        onClick={() => setEditing(true)}
        className={`-mx-2 max-w-full truncate rounded-lg px-2 py-0.5 text-left text-2xl font-semibold tracking-tight hover:bg-tutor ${title ? '' : 'text-muted'}`}
      >
        {title ?? UNTITLED_PLAN}
      </button>
    </h1>
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
      aria-label="Plan title"
      defaultValue={initial}
      placeholder={UNTITLED_PLAN}
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
      className="-mx-2 w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-0.5 text-2xl font-semibold tracking-tight outline-none focus:border-muted"
    />
  )
}
