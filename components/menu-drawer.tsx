'use client'

import { useRef } from 'react'
import { signOut } from '@/app/actions'

/**
 * The top bar's menu: a drawer that slides in from the left. A native modal dialog, so it traps focus, closes on
 * Escape, and keeps the page behind it inert; a click on the backdrop closes it too.
 */
export function MenuDrawer() {
  const ref = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" aria-label="Open menu" aria-haspopup="dialog" onClick={() => ref.current?.showModal()} className="rounded-lg p-2 text-muted hover:bg-tutor hover:text-foreground">
        <SidebarIcon />
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        // The panel fills the dialog, so a click landing on the dialog itself is on the backdrop.
        onClick={e => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] -translate-x-full border-r border-border bg-background p-0 text-foreground transition-[translate,display,overlay] transition-discrete duration-200 ease-out backdrop:bg-black/40 open:translate-x-0 motion-reduce:transition-none starting:open:-translate-x-full"
      >
        <div className="flex h-full flex-col gap-1 p-2 text-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="px-2 font-medium">funlern</span>
            <button type="button" aria-label="Close menu" onClick={() => ref.current?.close()} className="rounded-lg p-2 text-muted hover:bg-tutor hover:text-foreground">
              <SidebarIcon />
            </button>
          </div>
          <span className="rounded-lg px-2 py-1.5 text-muted">Profile</span>
          <form action={signOut} className="mt-auto">
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-tutor">Log out</button>
          </form>
        </div>
      </dialog>
    </>
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
