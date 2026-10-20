'use client'

import type { ReactNode } from 'react'

/** Mobile: the open thread slides in from the right. */
export function ThreadDrawer({ open, onClose, children }: { open: boolean, onClose: () => void, children: ReactNode }) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100%,24rem)] flex-col bg-background shadow-xl transition-transform duration-200 lg:hidden ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-medium">Thread</span>
          <button type="button" onClick={onClose} aria-label="Close thread" className="text-muted hover:text-foreground">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>
      </aside>
    </>
  )
}
