'use client'

import type { WizardInput } from '@/lib/plans/wizard'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { draftPlan, startPlan } from '@/lib/plans/actions'
import { MATERIAL_LIMITS } from '@/lib/plans/material'
import { uploadMaterial } from '@/lib/plans/upload'
import { LEVELS, SERIOUSNESS } from '@/lib/plans/wizard'
import styles from './creation-state.module.css'

/** Material picked in the form, uploaded once the plan exists. */
type Pick = { kind: 'file', file: File } | { kind: 'paste', name: string, text: string }
const pickName = (p: Pick) => p.kind === 'file' ? p.file.name : p.name || 'Pasted text'

const LEVEL_LABEL: Record<WizardInput['level'], string> = { new: 'New to it', some: 'Know some', comfortable: 'Comfortable' }
const SERIOUSNESS_LABEL: Record<WizardInput['seriousness'], string> = { casual: 'Casual', steady: 'Steady', serious: 'Serious' }
const INPUT = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none placeholder:text-muted focus:border-muted sm:text-[15px]'

/**
 * New-plan form. No name field: the tutor titles the plan when it drafts the brief and syllabus. Material is
 * uploaded to the new plan before drafting, so the first syllabus can follow it.
 */
export function WizardForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [what, setWhat] = useState('')
  const [why, setWhy] = useState('')
  const [level, setLevel] = useState<WizardInput['level']>('new')
  const [seriousness, setSeriousness] = useState<WizardInput['seriousness']>('steady')
  const [deadline, setDeadline] = useState('')
  const [picks, setPicks] = useState<Pick[]>([])
  const [paste, setPaste] = useState<{ name: string, text: string } | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  // Files that couldn't be added; the plan is created anyway and can take them later.
  const [skipped, setSkipped] = useState<{ planId: string, notes: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const full = picks.length >= MATERIAL_LIMITS.files

  function addFiles(files: FileList | null) {
    const room = MATERIAL_LIMITS.files - picks.length
    const added = [...files ?? []].slice(0, room).map(file => ({ kind: 'file' as const, file }))
    setPicks([...picks, ...added])
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.currentTarget.files)
    // Let the same file be picked again after removing it.
    e.currentTarget.value = ''
  }

  function addPaste() {
    if (!paste)
      return
    setPicks([...picks, { kind: 'paste', ...paste }])
    setPaste(null)
  }

  async function upload(planId: string, pick: Pick) {
    const refusal = await uploadMaterial(planId, pick.kind === 'file' ? { file: pick.file } : pick)
    return refusal && `${pickName(pick)}: ${refusal}`
  }

  function submit() {
    setError(null)
    const input: WizardInput = { what, why, level, seriousness, deadline: seriousness === 'serious' && deadline ? deadline : undefined }
    startTransition(async () => {
      try {
        setProgress('Creating your plan…')
        const { planId } = await startPlan(input)
        const notes: string[] = []
        for (const pick of picks) {
          setProgress(pick.kind === 'file' && pick.file.name.toLowerCase().endsWith('.pdf') ? `Reading ${pickName(pick)}…` : `Adding ${pickName(pick)}…`)
          const note = await upload(planId, pick)
          if (note)
            notes.push(note)
        }
        setProgress('Drafting your brief and syllabus…')
        const result = await draftPlan(planId, input)
        if (result.error) {
          setError(result.error)
          return
        }
        if (notes.length)
          setSkipped({ planId, notes })
        else
          router.push(`/p/${planId}/mc`)
      }
      catch {
        setError('The tutor couldn\'t draft your plan. Try again.')
      }
      finally {
        setProgress(null)
      }
    })
  }

  if (skipped) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">Your plan is ready, but some material couldn&apos;t be added:</p>
        <ul className="list-disc pl-5 text-sm text-muted">
          {skipped.notes.map(n => <li key={n}>{n}</li>)}
        </ul>
        <p className="text-sm text-muted">You can add it later from the plan&apos;s Material page.</p>
        <button type="button" onClick={() => router.push(`/p/${skipped.planId}/mc`)} className="h-10 self-start rounded-xl bg-student px-4 text-sm font-medium text-student-foreground">
          Open mission control
        </button>
      </div>
    )
  }

  return (
    <form
      aria-busy={pending}
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

      <fieldset disabled={pending} className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4 disabled:opacity-60">
        <legend className="px-1 text-sm font-medium">
          Material
          <span className="font-normal text-muted"> · optional</span>
        </legend>
        <p className="text-sm text-muted">
          {`A course syllabus or curriculum, prep docs, past questions you were asked, your notes; for interviews, your resume and stories. PDF or Markdown up to ${MATERIAL_LIMITS.bytes / 1024 / 1024}MB, or paste text; at most ${MATERIAL_LIMITS.files} files. The tutor drafts your syllabus from it.`}
        </p>
        {picks.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {picks.map((pick, i) => (
              // eslint-disable-next-line react/no-array-index-key -- picks have no id until uploaded
              <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{pickName(pick)}</span>
                <span className="text-xs text-muted">{pick.kind === 'file' ? `${Math.max(1, Math.round(pick.file.size / 1024))} KB` : 'Pasted'}</span>
                <button type="button" aria-label={`Remove ${pickName(pick)}`} onClick={() => setPicks(picks.filter((_, j) => j !== i))} className="rounded-lg px-1.5 text-muted hover:bg-tutor hover:text-foreground">×</button>
              </li>
            ))}
          </ul>
        )}
        {paste && (
          <div className="flex flex-col gap-2">
            <input aria-label="Name" placeholder="Name, e.g. Interview stories" value={paste.name} maxLength={120} onChange={e => setPaste({ ...paste, name: e.target.value })} className={INPUT} />
            <textarea aria-label="Pasted text" placeholder="Paste Markdown or plain text" rows={6} value={paste.text} onChange={e => setPaste({ ...paste, text: e.target.value })} className={`${INPUT} font-mono text-[13px]`} />
            <div className="flex gap-2">
              <button type="button" disabled={!paste.text.trim()} onClick={addPaste} className="rounded-lg bg-student px-3 py-1.5 text-sm text-student-foreground disabled:opacity-40">Add</button>
              <button type="button" onClick={() => setPaste(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-tutor">Cancel</button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" multiple accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain" className="hidden" onChange={pickFiles} />
        <div className="flex gap-2">
          <button type="button" disabled={full} onClick={() => fileRef.current?.click()} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-tutor disabled:opacity-40">Upload files</button>
          <button type="button" disabled={full || !!paste} onClick={() => setPaste({ name: '', text: '' })} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-tutor disabled:opacity-40">Paste text</button>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <div className={`${styles.frame} ${pending ? styles.rainbow : ''}`}>
          <button type="submit" disabled={pending || !what.trim()} className={`h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground ${pending ? styles.create : 'disabled:opacity-40'}`}>
            {pending ? 'Creating' : 'Create plan'}
          </button>
        </div>
        <p role="status" className="text-sm text-muted">
          {pending ? progress : error && <span className="text-incorrect">{error}</span>}
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
