'use client'

import { useRef } from 'react'

/**
 * A link that opens the ask-in-thread demo in a modal. A native modal dialog, like the menu drawer: focus is
 * trapped, Escape closes it, and so does a click on the backdrop. The video loads only when opened and pauses
 * when closed.
 */
export function DemoVideoLink({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  function open() {
    dialogRef.current?.showModal()
    void videoRef.current?.play().catch(() => {})
  }

  return (
    <>
      <button type="button" onClick={open} className="underline underline-offset-2 hover:text-foreground">
        {children}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="How ask-in-thread works"
        onClose={() => videoRef.current?.pause()}
        // The video fills the dialog, so a click landing on the dialog itself is on the backdrop.
        onClick={e => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[min(64rem,calc(100vw-2rem))] max-w-none rounded-2xl border border-border bg-background p-0 text-foreground backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between px-4 py-2 text-sm">
          <span className="font-medium">Ask in a side thread</span>
          <button type="button" aria-label="Close" onClick={() => dialogRef.current?.close()} className="rounded-lg px-2 py-1 text-muted hover:bg-tutor hover:text-foreground">×</button>
        </div>
        <video ref={videoRef} src="/demo/ask-in-thread.mp4" poster="/demo/ask-in-thread.jpg" preload="none" controls muted playsInline loop className="block w-full" />
      </dialog>
    </>
  )
}
