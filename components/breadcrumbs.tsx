import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * The app's top bar, the same on every page (rendered by the root layout's @crumbs slot): sidebar toggle
 * (placeholder until the drawer exists), home, then the page's own crumbs, the last being where you are.
 */
export function Breadcrumbs({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 px-2 text-sm">
      <button type="button" aria-label="Open sidebar" className="rounded-lg p-2 text-muted hover:bg-tutor hover:text-foreground">
        <SidebarIcon />
      </button>
      <Link href="/" className="rounded-lg px-2 py-1.5 text-muted hover:bg-tutor hover:text-foreground">funlern</Link>
      {children}
    </header>
  )
}

/** A crumb on the way to the current page. */
export function CrumbLink({ href, children }: { href: string, children: ReactNode }) {
  return (
    <>
      <Separator />
      <Link href={href} className="min-w-0 max-w-[40%] truncate rounded-lg px-2 py-1.5 text-muted hover:bg-tutor hover:text-foreground">
        {children}
      </Link>
    </>
  )
}

/** The current page, as text, or as `children` alone when it brings its own control (a rename button). */
export function Crumb({ children, muted = false, bare = false }: { children: ReactNode, muted?: boolean, bare?: boolean }) {
  return (
    <>
      <Separator />
      {bare ? children : <span className={`min-w-0 truncate px-2 py-1.5 ${muted ? 'text-muted' : ''}`}>{children}</span>}
    </>
  )
}

function Separator() {
  return <span aria-hidden className="text-muted/60">/</span>
}

function SidebarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-[18px]" aria-hidden>
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
      <path d="M7.5 3.75v12.5" />
    </svg>
  )
}
