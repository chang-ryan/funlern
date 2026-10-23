'use client'

import { useActionState, useState } from 'react'
import { saveProfile } from '@/app/profile/actions'

const field = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none placeholder:text-muted focus:border-muted sm:text-[15px]'

/** nameMax comes from the page: the limit lives in a server-only module. */
export function ProfileForm({ name, email, nameMax }: { name: string, email: string | null, nameMax: number }) {
  const [state, action, pending] = useActionState(saveProfile, { saved: false })
  // "Saved" shows until the name is edited again.
  const [dirty, setDirty] = useState(false)

  return (
    <form action={action} onSubmit={() => setDirty(false)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={name}
          maxLength={nameMax}
          // At least one non-space, so a blank name can't get past the browser.
          pattern=".*\S.*"
          autoComplete="given-name"
          onChange={() => setDirty(true)}
          className={field}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" value={email ?? ''} readOnly disabled className={`${field} text-muted`} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground disabled:opacity-60">
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state.saved && !dirty && !pending && <span role="status" className="text-sm text-muted">Saved</span>}
      </div>
    </form>
  )
}
