'use client'

import type { Command } from '@/lib/commands'

/** Slash-command list that pops up above the composer. Keyboard handling lives in the composer. */
export function CommandMenu({ id, commands, active, onHover, onPick }: {
  id: string
  commands: Command[]
  active: number
  onHover: (index: number) => void
  onPick: (command: Command) => void
}) {
  return (
    <div
      id={id}
      role="listbox"
      aria-label="Commands"
      // Keep focus in the composer while clicking.
      onMouseDown={e => e.preventDefault()}
      className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-full rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
    >
      {commands.map((c, i) => (
        <div
          key={c.name}
          id={`${id}-${c.name}`}
          role="option"
          aria-selected={i === active}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(c)}
          className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] ${i === active ? 'bg-border' : ''}`}
        >
          <CommandIcon icon={c.icon} />
          {c.label}
        </div>
      ))}
    </div>
  )
}

function CommandIcon({ icon }: { icon: Command['icon'] }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0 text-muted" aria-hidden>
      {icon === 'quiz'
        ? (
            <>
              <circle cx="10" cy="10" r="7.25" />
              <path d="M7.9 7.6a2.2 2.2 0 0 1 4.2.9c0 1.5-2.1 1.9-2.1 3.1" />
              <path d="M10 14.25h.01" />
            </>
          )
        : (
            <>
              <path d="M4 4.75A1.75 1.75 0 0 1 5.75 3H15v11.5H5.75A1.75 1.75 0 0 0 4 16.25z" />
              <path d="M4 16.25A1.75 1.75 0 0 0 5.75 18H15v-3.5M7.5 6.5h4.5M7.5 9h3" />
            </>
          )}
    </svg>
  )
}
