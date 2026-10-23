import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getDisplayName, NAME_MAX } from '@/lib/db/profiles'
import { saveName } from './actions'

/** A new sign-up's first stop: home sends anyone without a name here. */
export default async function WelcomePage() {
  if (await getDisplayName(await requireUser()))
    redirect('/')
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to funlern</h1>
        <p className="text-sm text-muted">What should we call you?</p>
      </header>
      <form action={saveName} className="flex flex-col gap-3">
        <label htmlFor="name" className="sr-only">Your name</label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          maxLength={NAME_MAX}
          // At least one non-space, so a blank name can't get past the browser.
          pattern=".*\S.*"
          autoComplete="given-name"
          placeholder="Your name"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none placeholder:text-muted focus:border-muted sm:text-[15px]"
        />
        <button type="submit" className="h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground">Continue</button>
      </form>
    </main>
  )
}
