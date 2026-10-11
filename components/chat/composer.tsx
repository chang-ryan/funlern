'use client'

import { useRef, useState } from 'react'

export function Composer({ onSend, onStop, busy, placeholder = 'Ask anything…' }: {
  onSend: (text: string) => void
  onStop?: () => void
  busy?: boolean
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const value = text.trim()
    if (!value || busy)
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
      className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-muted"
    >
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value)
          e.target.style.height = ''
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
        }}
        onKeyDown={(e) => {
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
            <button type="submit" disabled={!text.trim()} className="h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground disabled:opacity-40">
              Send
            </button>
          )}
    </form>
  )
}
