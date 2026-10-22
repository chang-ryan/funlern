import type { ReactNode } from 'react'

/** Plan page frame: the main column (plan home or a doc), and the files column beside it. */
export function PlanShell({ files, children }: {
  files: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <main className="flex min-w-0 flex-col gap-6">
          {children}
        </main>
        <aside className="lg:pt-12">{files}</aside>
      </div>
    </div>
  )
}
