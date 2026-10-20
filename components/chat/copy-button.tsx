'use client'

import { useEffect, useState } from 'react'

/** Copies a tutor reply's markdown. Says "Copied" for a moment, or why it couldn't. */
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle')
      return
    const timer = setTimeout(setState, 1500, 'idle')
    return () => clearTimeout(timer)
  }, [state])

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => setState('copied'), () => setState('failed'))}
      aria-label="Copy reply"
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-tutor hover:text-foreground"
    >
      {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn\'t copy' : 'Copy'}
    </button>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5" aria-hidden>
      <rect x="6.5" y="6.5" width="10" height="10" rx="2" />
      <path d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  )
}
