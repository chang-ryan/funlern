'use client'

import type { PlanDoc } from '@/lib/db/plans'
import type { DocKind } from '@/lib/plans/docs'
import { useState, useTransition } from 'react'
import { restoreDocVersion, saveDocSection } from '@/app/p/[id]/docs/actions'
import { TutorMarkdown } from '@/components/chat/tutor-markdown'
import { DOC_FILE, DOC_SECTIONS, parseDoc } from '@/lib/plans/docs'
import { shortDate, shortDateTime } from './format'

// Task lists render a checkbox; drop the bullet that would sit beside it.
const MARKDOWN = 'text-[15px] leading-relaxed [&_li:has(>input[type=checkbox])]:list-none'

/**
 * A plan doc, full page: each fixed section with its own Edit, and a history of versions to preview or restore.
 * Every save is a new version. A textarea per section for now; a WYSIWYG editor comes later.
 */
export function DocEditor({ planId, kind, doc, versions }: {
  planId: string
  kind: DocKind
  doc: PlanDoc
  /** Every version, newest first. */
  versions: PlanDoc[]
}) {
  const [editing, setEditing] = useState<{ section: string, text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [pending, startTransition] = useTransition()
  const sections = parseDoc(kind, doc.body) as Record<string, string | undefined>

  function edit(section: string) {
    setError(null)
    setEditing({ section, text: sections[section] ?? '' })
  }

  function save() {
    if (!editing)
      return
    startTransition(async () => {
      const result = await saveDocSection({ planId, kind, section: editing.section, text: editing.text, baseVersion: doc.version })
      if (result.ok)
        setEditing(null)
      else
        setError(result.error)
    })
  }

  function restore(version: number) {
    setError(null)
    startTransition(async () => {
      const result = await restoreDocVersion({ planId, kind, version })
      if (!result.ok)
        setError(result.error)
    })
  }

  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-semibold tracking-tight">{DOC_FILE[kind]}</h1>
          <p className="text-sm text-muted">{`version ${doc.version} · by ${authorLabel(doc)} · ${shortDate(doc.createdAt)}`}</p>
        </div>
        <button
          type="button"
          aria-expanded={showHistory}
          onClick={() => setShowHistory(v => !v)}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-border/50"
        >
          History
        </button>
      </header>

      {error && <p role="alert" className="text-sm text-incorrect">{error}</p>}

      {showHistory && <History versions={versions} current={doc.version} pending={pending} onRestore={restore} />}

      {DOC_SECTIONS[kind].map((section: string) => (
        <section key={section} aria-labelledby={`section-${section}`} className="group flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`section-${section}`} className="text-lg font-semibold">{section}</h2>
            {editing?.section !== section && (
              <button
                type="button"
                onClick={() => edit(section)}
                disabled={!!editing}
                className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-border/50 hover:text-foreground disabled:hidden sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                Edit
              </button>
            )}
          </div>
          {editing?.section === section
            ? (
                <SectionInput
                  label={section}
                  text={editing.text}
                  pending={pending}
                  onChange={text => setEditing({ section, text })}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              )
            : sections[section]
              ? <TutorMarkdown text={sections[section]} className={MARKDOWN} />
              : <p className="text-sm text-muted">Empty</p>}
        </section>
      ))}
    </article>
  )
}

function SectionInput({ label, text, pending, onChange, onSave, onCancel }: {
  label: string
  text: string
  pending: boolean
  onChange: (text: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        aria-label={label}
        value={text}
        autoFocus
        disabled={pending}
        rows={Math.min(Math.max(text.split('\n').length + 1, 4), 20)}
        onChange={e => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
            onSave()
          if (e.key === 'Escape')
            onCancel()
        }}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-muted disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="h-9 rounded-xl bg-student px-4 text-sm font-medium text-student-foreground disabled:opacity-40">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className="h-9 rounded-xl border border-border px-4 text-sm hover:bg-border/50">
          Cancel
        </button>
        <span className="text-xs text-muted">Markdown · ⌘↵ to save</span>
      </div>
    </form>
  )
}

/** Versions newest first. Preview shows a version's text; Restore copies it forward as a new version. */
function History({ versions, current, pending, onRestore }: {
  versions: PlanDoc[]
  current: number
  pending: boolean
  onRestore: (version: number) => void
}) {
  const [preview, setPreview] = useState<number | null>(null)

  return (
    <section aria-label="Version history" className="rounded-2xl border border-border bg-surface p-1">
      <ul className="flex flex-col">
        {versions.map(v => (
          <li key={v.version} className="flex flex-col">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
              <span className="w-8 shrink-0 font-mono text-xs text-muted">{`v${v.version}`}</span>
              <span className="min-w-0 flex-1 truncate">
                {v.summary ?? (v.version === 1 ? 'First draft' : 'Updated')}
                <span className="text-muted">{` · ${authorLabel(v)} · ${shortDateTime(v.createdAt)}`}</span>
              </span>
              <button
                type="button"
                aria-expanded={preview === v.version}
                onClick={() => setPreview(p => p === v.version ? null : v.version)}
                className="rounded-lg px-2 py-0.5 text-xs text-muted hover:bg-border/50 hover:text-foreground"
              >
                {preview === v.version ? 'Hide' : 'Preview'}
              </button>
              {v.version === current
                ? <span className="w-[3.75rem] text-center text-xs text-muted">Current</span>
                : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onRestore(v.version)}
                      className="w-[3.75rem] rounded-lg border border-border px-2 py-0.5 text-xs hover:bg-border/50 disabled:opacity-40"
                    >
                      Restore
                    </button>
                  )}
            </div>
            {preview === v.version && (
              <div className="mx-3 mb-2 max-h-96 overflow-y-auto rounded-xl border border-border px-4 py-3">
                <TutorMarkdown text={v.body} className={`${MARKDOWN} text-sm`} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function authorLabel(doc: PlanDoc) {
  return doc.author === 'tutor' ? 'tutor' : 'you'
}
