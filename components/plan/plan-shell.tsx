import type { ReactNode } from 'react'
import Link from 'next/link'

/** Plan page frame: a back link, the main column (plan home or a doc), and the files column beside it. */
export function PlanShell({ back, files, children }: {
  back: { href: string, label: string }
  files: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <main className="flex min-w-0 flex-col gap-6">
          <Link href={back.href} className="-ml-2 self-start rounded-lg px-2 py-1 text-sm text-muted hover:bg-tutor hover:text-foreground">
            ←
            {' '}
            {back.label}
          </Link>
          {children}
        </main>
        <aside className="lg:pt-12">{files}</aside>
      </div>
    </div>
  )
}
