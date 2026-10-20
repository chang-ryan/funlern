'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { deleteMaterial } from '@/app/p/[id]/material/actions'
import { MATERIAL_LIMITS } from '@/lib/plans/material'
import { shortDate } from './format'

interface Item { id: string, kind: 'pdf' | 'markdown' | 'paste', name: string, text: string, pages: number | null, tokens: number, createdAt: Date }

const KIND_LABEL = { pdf: 'PDF', markdown: 'Markdown', paste: 'Pasted' }

/**
 * A plan's material, full page: the files with what the tutor reads from each, plus upload and paste. Files
 * are write-once, so there is no edit: delete one and add another.
 */
export function MaterialList({ planId, items }: { planId: string, items: Item[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paste, setPaste] = useState<{ name: string, text: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const used = items.reduce((n, m) => n + m.tokens, 0)
  const full = items.length >= MATERIAL_LIMITS.files

  async function add(body: FormData, label: string) {
    setBusy(label)
    setError(null)
    try {
      const res = await fetch(`/api/plans/${planId}/materials`, { method: 'POST', body })
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? 'Couldn\'t add that file.')
        return false
      }
      router.refresh()
      return true
    }
    catch {
      setError('Couldn\'t add that file.')
      return false
    }
    finally {
      setBusy(null)
    }
  }

  async function upload(file: File) {
    const body = new FormData()
    body.set('file', file)
    await add(body, file.type === 'application/pdf' ? `Reading ${file.name}…` : `Adding ${file.name}…`)
  }

  async function savePaste() {
    if (!paste)
      return
    const body = new FormData()
    body.set('name', paste.name)
    body.set('text', paste.text)
    if (await add(body, 'Adding pasted text…'))
      setPaste(null)
  }

  function remove(item: Item) {
    startTransition(async () => {
      await deleteMaterial(planId, item.id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Material</h1>
        <p className="text-sm leading-relaxed text-muted">
          What you&apos;re studying from: a course syllabus or curriculum, prep docs, past questions you were asked, your notes. Training for interviews? Add your resume and the stories you&apos;d tell. The tutor reads all of it in every session of this plan.
        </p>
        <p className="text-xs text-muted">
          {`${items.length} of ${MATERIAL_LIMITS.files} files · about ${used.toLocaleString()} of ${MATERIAL_LIMITS.tokens.toLocaleString()} tokens · files up to ${MATERIAL_LIMITS.bytes / 1024 / 1024}MB. Files can't be edited: delete one and add another to change it.`}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0]
            e.currentTarget.value = ''
            if (file)
              void upload(file)
          }}
        />
        <button type="button" disabled={full || !!busy} onClick={() => fileRef.current?.click()} className="rounded-lg bg-student px-3 py-1.5 text-sm text-student-foreground disabled:opacity-50">
          Upload PDF or Markdown
        </button>
        <button type="button" disabled={full || !!busy || !!paste} onClick={() => setPaste({ name: '', text: '' })} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-tutor disabled:opacity-50">
          Paste text
        </button>
        {busy && <span className="self-center text-sm text-muted">{busy}</span>}
      </div>
      {error && <p className="text-sm text-incorrect">{error}</p>}

      {paste && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
          <input
            aria-label="Name"
            placeholder="Name, e.g. Interview stories"
            value={paste.name}
            maxLength={120}
            onChange={e => setPaste({ ...paste, name: e.target.value })}
            className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-muted"
          />
          <textarea
            aria-label="Text"
            placeholder="Paste Markdown or plain text"
            value={paste.text}
            onChange={e => setPaste({ ...paste, text: e.target.value })}
            rows={10}
            className="resize-y rounded-lg border border-border bg-transparent px-2 py-1.5 font-mono text-[13px] outline-none focus:border-muted"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPaste(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-tutor">Cancel</button>
            <button type="button" disabled={!paste.text.trim() || !!busy} onClick={savePaste} className="rounded-lg bg-student px-3 py-1.5 text-sm text-student-foreground disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {items.length === 0
        ? <p className="py-3 text-sm text-muted">No material yet.</p>
        : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {items.map(item => (
                <li key={item.id} className="py-3">
                  <div className="flex items-baseline gap-3">
                    <button type="button" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id} className="min-w-0 flex-1 truncate text-left hover:text-muted">
                      {item.name}
                    </button>
                    <span className="shrink-0 text-xs text-muted">
                      {[KIND_LABEL[item.kind], item.pages && `${item.pages} pages`, `~${item.tokens.toLocaleString()} tokens`, shortDate(item.createdAt)].filter(Boolean).join(' · ')}
                    </span>
                    <button type="button" onClick={() => remove(item)} className="shrink-0 rounded-lg px-2 py-0.5 text-xs text-muted hover:bg-tutor hover:text-incorrect">Delete</button>
                  </div>
                  {open === item.id && (
                    <div className="mt-2 flex flex-col gap-1">
                      <p className="text-xs text-muted">What the tutor reads:</p>
                      <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">{item.text}</pre>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
