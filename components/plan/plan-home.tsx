'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Composer } from '@/components/chat/composer'
import { Conversation } from '@/components/conversation'
import { UNTITLED_PLAN } from './format'
import { PlanShell } from './plan-shell'
import { PlanTitle } from './plan-title'
import { SessionList } from './session-list'

/**
 * The plan page: title, a composer that starts a session in the plan, and its recent sessions.
 * Sending swaps the whole page for the new session, which saves itself and moves to /c/{id}.
 */
export function PlanHome({ plan, sessions, model, files }: {
  plan: { id: string, title: string | null }
  sessions: { id: string, title: string | null, createdAt: Date }[]
  model: string
  files: ReactNode
}) {
  const [started, setStarted] = useState<{ id: string, text: string } | null>(null)

  if (started) {
    return (
      <Conversation
        id={started.id}
        isNew
        planId={plan.id}
        firstMessage={started.text}
        title={null}
        model={model}
        initialMessages={[]}
        initialThreads={[]}
      />
    )
  }

  return (
    <PlanShell back={{ href: '/', label: 'All plans' }} files={files}>
      <PlanTitle planId={plan.id} initial={plan.title} />
      <Composer
        placeholder={`New session in ${plan.title ?? UNTITLED_PLAN}`}
        onSend={text => setStarted({ id: crypto.randomUUID(), text })}
        autoFocus
      />
      <section aria-labelledby="recents" className="flex flex-col gap-2">
        <h2 id="recents" className="text-sm font-medium text-muted">Recents</h2>
        <SessionList
          items={sessions.map(s => ({ href: `/c/${s.id}`, title: s.title ?? 'Untitled session', date: s.createdAt }))}
          empty="No sessions yet. Start one above."
        />
      </section>
    </PlanShell>
  )
}
