'use client'

import type { UIMessage } from 'ai'
import type { ThreadData } from './types'
import type { SessionMode, TrainingStyle } from '@/lib/plans/modes'
import { useEffect, useState } from 'react'
import { clearPendingStart, peekPendingStart } from '@/lib/pending-start'
import { Conversation } from './conversation'

interface Saved {
  mode: SessionMode
  trainingStyle: TrainingStyle | null
  messages: UIMessage[]
  threads: ThreadData[]
}

/**
 * The page at /c/{id}, saved or not. Unsaved, it's a new session: if the page that opened it (the plan hub) handed
 * over a first message, that's sent on mount, in that plan and mode. One component for both, so when the first
 * reply is saved and the page refreshes, the same Conversation carries on instead of remounting.
 */
export function Session({ id, model, saved }: { id: string, model: string, saved: Saved | null }) {
  const [pending] = useState(() => saved ? undefined : peekPendingStart(id))
  useEffect(() => clearPendingStart(id), [id])

  if (saved) {
    return <Conversation id={id} mode={saved.mode} trainingStyle={saved.trainingStyle} model={model} initialMessages={saved.messages} initialThreads={saved.threads} />
  }
  return (
    <Conversation
      id={id}
      isNew
      start={pending?.start}
      trainingStyle={pending?.start.style ?? null}
      firstMessage={pending?.text}
      model={model}
      initialMessages={[]}
      initialThreads={[]}
    />
  )
}
