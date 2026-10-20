'use client'

import type { WizardInput } from '@/lib/plans/wizard'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createPlan } from '@/lib/plans/actions'
import { LEVELS, SERIOUSNESS } from '@/lib/plans/wizard'

const LEVEL_LABEL: Record<WizardInput['level'], string> = { new: 'New to it', some: 'Know some', comfortable: 'Comfortable' }
const SERIOUSNESS_LABEL: Record<WizardInput['seriousness'], string> = { casual: 'Casual', steady: 'Steady', serious: 'Serious' }
const INPUT = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none placeholder:text-muted focus:border-muted sm:text-[15px]'

/** New-plan form. No name field: the tutor titles the plan when it drafts the brief and syllabus. */
export function WizardForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [what, setWhat] = useState('')
  const [why, setWhy] = useState('')
  const [level, setLevel] = useState<WizardInput['level']>('new')
  const [seriousness, setSeriousness] = useState<WizardInput['seriousness']>('steady')
  const [deadline, setDeadline] = useState('')

  function submit() {
    setError(null)
    const input: WizardInput = { what, why, level, seriousness, deadline: seriousness === 'serious' && deadline ? deadline : undefined }
    startTransition(async () => {
      try {
        const { planId } = await createPlan(input)
        router.push(`/p/${planId}`)
      }
      catch {
        setError('The tutor couldn\'t draft your plan. Try again.')
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-6"
    >
      <fieldset disabled={pending} className="flex flex-col gap-6 disabled:opacity-60">
        <Field label="What do you want to learn?" htmlFor="what">
          <textarea id="what" required rows={3} value={what} onChange={e => setWhat(e.target.value)} placeholder="e.g. Postgres internals, enough to debug slow queries" className={INPUT} />
        </Field>
        <Field label="Why?" htmlFor="why" optional>
          <textarea id="why" rows={2} value={why} onChange={e => setWhy(e.target.value)} placeholder="e.g. a backend interview in a month" className={INPUT} />
        </Field>
        <Choice legend="Level" options={LEVELS} labels={LEVEL_LABEL} value={level} onChange={setLevel} />
        <Choice legend="How serious?" options={SERIOUSNESS} labels={SERIOUSNESS_LABEL} value={seriousness} onChange={setSeriousness} />
        {seriousness === 'serious' && (
          <Field label="Deadline" htmlFor="deadline" optional>
            <input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={`${INPUT} w-auto`} />
          </Field>
        )}
      </fieldset>

      <fieldset disabled className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-4">
        <legend className="px-1 text-sm font-medium">
          Material
          {' '}
          <span className="font-normal text-muted">· coming soon</span>
        </legend>
        <p className="text-sm text-muted">
          A course syllabus or curriculum, prep docs, past questions you were asked, your notes; for interviews, your resume and stories. PDF or Markdown, or paste text.
        </p>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || !what.trim()} className="h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground disabled:opacity-40">
          {pending ? 'Drafting…' : 'Create plan'}
        </button>
        <p role="status" className="text-sm text-muted">
          {pending ? 'Drafting your brief and syllabus…' : error && <span className="text-incorrect">{error}</span>}
        </p>
      </div>
    </form>
  )
}

function Field({ label, htmlFor, optional, children }: { label: string, htmlFor: string, optional?: boolean, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> · optional</span>}
      </label>
      {children}
    </div>
  )
}

function Choice<T extends string>({ legend, options, labels, value, onChange }: {
  legend: string
  options: readonly T[]
  labels: Record<T, string>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <label key={option} className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-sm has-checked:border-student has-checked:bg-student has-checked:text-student-foreground has-focus-visible:ring-2 has-focus-visible:ring-muted">
            <input type="radio" name={legend} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
