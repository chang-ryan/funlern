'use client'

import type { Command } from '@/lib/commands'
import { useEffect, useId, useRef, useState } from 'react'
import { commandMatches } from '@/lib/commands'
import { CommandMenu } from './command-menu'

export function Composer({ onSend, onStop, busy, placeholder = 'Ask anything…', autoFocus, initialText = '', commands, disabledReason }: {
  onSend: (text: string) => void
  onStop?: () => void
  busy?: boolean
  placeholder?: string
  autoFocus?: boolean
  /** Starting text, e.g. a question put back after a failed send. */
  initialText?: string
  /** Slash commands: typing '/' lists them, and picking one fills in '/name '. */
  commands?: Command[]
  /** Turns the composer off, shown as its placeholder. */
  disabledReason?: string
}) {
  const [text, setText] = useState(initialText)
  const [active, setActive] = useState(0)
  // Escape hides the menu until the text changes.
  const [dismissed, setDismissed] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const menuId = useId()
  const matches = commands && !dismissed && !disabledReason ? commandMatches(text, commands) : null
  const activeIndex = matches ? Math.min(active, matches.length - 1) : -1
  const highlighted = matches?.[activeIndex]

  // Not the autoFocus attribute: it scrolls to the box, and a rail card mounts at the rail's top
  // before it is moved beside its passage.
  useEffect(() => {
    if (autoFocus)
      ref.current?.focus({ preventScroll: true })
  }, [autoFocus])

  function resize(el: HTMLTextAreaElement) {
    el.style.height = ''
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  function edit(value: string) {
    setText(value)
    setActive(0)
    setDismissed(false)
  }

  function pick(command: Command) {
    const value = `/${command.name} `
    edit(value)
    const el = ref.current
    if (el) {
      el.focus()
      // After React writes the new value, put the caret at its end.
      requestAnimationFrame(() => el.setSelectionRange(value.length, value.length))
    }
  }

  function submit() {
    const value = text.trim()
    if (!value || busy || disabledReason)
      return
    onSend(value)
    setText('')
    if (ref.current)
      ref.current.style.height = ''
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="relative flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-muted has-[textarea:disabled]:opacity-60"
    >
      {matches && <CommandMenu id={menuId} commands={matches} active={activeIndex} onHover={setActive} onPick={pick} />}
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder={disabledReason ?? placeholder}
        disabled={!!disabledReason}
        role={commands ? 'combobox' : undefined}
        aria-expanded={commands ? !!matches : undefined}
        aria-controls={matches ? menuId : undefined}
        aria-activedescendant={highlighted ? `${menuId}-${highlighted.name}` : undefined}
        onChange={(e) => {
          edit(e.target.value)
          resize(e.target)
        }}
        onKeyDown={(e) => {
          if (matches && highlighted) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((activeIndex + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
              return
            }
            if ((e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) || e.key === 'Tab') {
              e.preventDefault()
              pick(highlighted)
              return
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setDismissed(true)
              return
            }
          }
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted sm:text-[15px]"
      />
      {busy && onStop
        ? (
            <button type="button" onClick={onStop} className="h-10 rounded-xl border border-border px-4 text-sm font-medium">
              Stop
            </button>
          )
        : (
            <button type="submit" disabled={!text.trim() || !!disabledReason} className="h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground disabled:opacity-40">
              Send
            </button>
          )}
    </form>
  )
}
