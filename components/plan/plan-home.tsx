'use client'

import type { ReactNode } from 'react'
import type { SessionMode, TrainingStyle } from '@/lib/plans/modes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Composer } from '@/components/chat/composer'
import { setPendingStart } from '@/lib/pending-start'
import { sessionLabel, TRAINING_STYLE_HINT, TRAINING_STYLE_LABEL, TRAINING_STYLES } from '@/lib/plans/modes'
import { UNTITLED_PLAN } from './format'
import { PlanShell } from './plan-shell'
import { PlanTitle } from './plan-title'
import { SessionList } from './session-list'

/**
 * The plan page: title, a composer that starts a learning or training session in the plan, and its recent
 * sessions. Sending opens the new session at /c/{id} with the message, which starts it there. The mode is fixed
 * once the session starts. Training needs training.md, which mission control sets up.
 */
export function PlanHome({ plan, sessions, files, hasTraining, initialMode = 'learning' }: {
  plan: { id: string, title: string | null }
  sessions: { id: string, title: string | null, mode: SessionMode, trainingStyle: TrainingStyle | null, createdAt: Date }[]
  files: ReactNode
  hasTraining: boolean
  initialMode?: SessionMode
}) {
  const [mode, setMode] = useState<SessionMode>(initialMode)
  const [style, setStyle] = useState<TrainingStyle>('guided')
  const router = useRouter()

  const name = plan.title ?? UNTITLED_PLAN
  const setup = mode === 'training' && !hasTraining
  function begin(text: string) {
    const id = crypto.randomUUID()
    setPendingStart(id, { text, plan, start: { planId: plan.id, mode, style: mode === 'training' && hasTraining ? style : undefined } })
    router.push(`/c/${id}`)
  }

  return (
    <PlanShell files={files}>
      <PlanTitle planId={plan.id} initial={plan.title} />
      <div className="flex flex-col gap-2">
        <Composer
          placeholder={mode === 'learning' ? `New session in ${name}` : `New ${TRAINING_STYLE_LABEL[style].toLowerCase()} rep in ${name}`}
          disabledReason={setup ? 'Set up training first: mission control writes training.md with you' : undefined}
          onSend={begin}
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-sm">
          <Segmented
            label="Session"
            value={mode}
            options={[{ value: 'learning', label: 'Learn' }, { value: 'training', label: 'Train' }]}
            onChange={setMode}
          />
          {mode === 'training' && hasTraining && (
            <>
              <Segmented label="Rep style" value={style} options={TRAINING_STYLES.map(s => ({ value: s, label: TRAINING_STYLE_LABEL[s] }))} onChange={setStyle} />
              <span className="text-xs text-muted">{TRAINING_STYLE_HINT[style]}</span>
            </>
          )}
          {setup && (
            <Link href={`/p/${plan.id}/mc?do=setup-training`} className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-border">
              Set up training
            </Link>
          )}
        </div>
      </div>
      <section aria-labelledby="recents" className="flex flex-col gap-2">
        <h2 id="recents" className="text-sm font-medium text-muted">Recents</h2>
        <SessionList
          items={sessions.map(s => ({ href: `/c/${s.id}`, title: s.title ?? 'Untitled session', description: sessionLabel(s.mode, s.trainingStyle), date: s.createdAt }))}
          empty="No sessions yet. Start one above."
        />
      </section>
    </PlanShell>
  )
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T, label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-0.5 text-xs ${o.value === value ? 'bg-border text-foreground' : 'text-muted hover:text-foreground'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
