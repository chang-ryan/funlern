'use client'

import { useState } from 'react'
import { MODEL_COOKIE, modelLabel, MODELS } from '@/lib/ai/models'

/** Picks the model the next turn goes to. The pick rides a cookie, so every route (main, threads) reads it. */
export function ModelPicker({ initial }: { initial: string }) {
  const [model, setModel] = useState(initial)
  // The default can come from the env and not be on offer; still show it.
  const options = MODELS.includes(model as never) ? MODELS : [model, ...MODELS]

  function pick(id: string) {
    setModel(id)
    document.cookie = `${MODEL_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
  }

  return (
    <label className="relative mt-1.5 inline-flex items-center rounded-md text-xs text-muted hover:text-foreground">
      <span className="sr-only">Model</span>
      <select
        value={model}
        onChange={e => pick(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-0.5 pr-5 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-muted/40"
      >
        {options.map(id => <option key={id} value={id}>{modelLabel(id)}</option>)}
      </select>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-1 size-3" aria-hidden>
        <path d="M6 8l4 4 4-4" />
      </svg>
    </label>
  )
}
