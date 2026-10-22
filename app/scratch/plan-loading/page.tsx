'use client'

import { useState } from 'react'
import styles from '@/components/plan/creation-state.module.css'

export default function PlanLoadingPreview() {
  const [loading, setLoading] = useState(true)
  const [placement, setPlacement] = useState('button')

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Scratch / loading state</p>
        <h1 className="text-2xl font-semibold tracking-tight">A little color while you wait.</h1>
        <p className="text-sm text-muted">Preview the creation state. Nothing here creates a plan.</p>
      </header>

      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-6 text-sm">
        <button type="button" aria-pressed={loading} onClick={() => setLoading(!loading)} className="rounded-lg border border-border px-3 py-2 hover:bg-tutor">
          {loading ? 'Show idle state' : 'Show loading state'}
        </button>
        <label className="flex items-center gap-2 text-muted">
          Border around
          <select value={placement} onChange={e => setPlacement(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-2 text-foreground">
            <option value="button">Button</option>
            <option value="form">Form</option>
          </select>
        </label>
      </div>

      <section aria-labelledby="preview-title" aria-busy={loading} className={`${styles.frame} ${placement === 'form' ? styles.panel : ''} ${loading && placement === 'form' ? styles.rainbow : ''}`}>
        <header className="mb-7 flex flex-col gap-1">
          <h2 id="preview-title" className="text-2xl font-semibold tracking-tight">New plan</h2>
          <p className="text-sm text-muted">Tell the tutor what you're after. It drafts a brief and a syllabus you can change later.</p>
        </header>

        <fieldset disabled={loading} className="flex flex-col gap-6 disabled:opacity-60">
          <label className="flex flex-col gap-2 text-sm font-medium">
            What do you want to learn?
            <textarea defaultValue="I want to learn about world history starting from the 1000s AD." rows={3} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-base font-normal outline-none focus:border-muted" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Why? · optional
            <textarea placeholder="e.g. a backend interview in a month" rows={2} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-base font-normal outline-none placeholder:text-muted focus:border-muted" />
          </label>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-medium">Level</span>
              <span className="self-start rounded-xl bg-student px-3 py-2 text-student-foreground">New to it</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium">How serious?</span>
              <span className="self-start rounded-xl bg-student px-3 py-2 text-student-foreground">Casual</span>
            </div>
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className={`${styles.frame} ${loading && placement === 'button' ? styles.rainbow : ''}`}>
            <button type="button" disabled={loading} onClick={() => setLoading(true)} className={`${styles.create} h-10 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground`}>
              {loading ? 'Creating' : 'Create plan'}
            </button>
          </div>
          <p role="status" className="text-sm text-muted">{loading ? 'Drafting your brief and syllabus…' : 'Ready when you are.'}</p>
        </div>
      </section>
      <p className="text-xs text-muted">The border stays still when reduced motion is enabled.</p>
    </main>
  )
}
