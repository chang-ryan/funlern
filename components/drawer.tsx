'use client'

import type { ReactNode } from 'react'
import { useId, useState } from 'react'

/**
 * A panel that slides shut upward into its bottom border. The toggle sits centered on that border, so even shut
 * the line and its button show there's something to open.
 */
export function Drawer({ label, children, className = '' }: {
  /** What the drawer holds, for the toggle's accessible name ("Hide mission control"). */
  label: string
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(true)
  const id = useId()

  return (
    // Above what follows, which the toggle overlaps by half.
    <div className={`relative z-10 shrink-0 border-b border-border ${className}`}>
      <div id={id} inert={!open} className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${open ? 'Hide' : 'Show'} ${label}`}
        title={open ? 'Hide' : 'Show'}
        onClick={() => setOpen(o => !o)}
        className="absolute bottom-0 left-1/2 grid size-7 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full border border-border bg-background text-muted hover:bg-tutor hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`size-3.5 transition-transform duration-300 motion-reduce:transition-none ${open ? '' : 'rotate-180'}`}>
          <path d="M4 10l4-4 4 4" />
        </svg>
      </button>
    </div>
  )
}
