import type { UIMessage } from 'ai'
import type { SideQuestion, SideQuestionsData } from './side-questions'
import type { Anchor } from '@/lib/db/schema'
import { textOf } from '@/lib/messages'

interface Fold { data: SideQuestionsData, foldedThrough: { threadId: string, count: number }[] }

interface FoldableThread { id: string, anchor: Anchor, foldedThrough: number, messages: UIMessage[] }

/** Completed thread exchanges not yet folded into main, in thread order. */
export function foldThreads(threads: FoldableThread[]): Fold | null {
  const questions: SideQuestion[] = []
  const foldedThrough: Fold['foldedThrough'] = []

  for (const t of threads) {
    // Only whole exchanges: stop after the last tutor reply.
    const complete = t.messages.slice(0, t.messages.findLastIndex(m => m.role === 'assistant') + 1)
    const fresh = complete.slice(t.foldedThrough)
    if (!fresh.length)
      continue
    questions.push({
      threadId: t.id,
      regarding: t.anchor.quote,
      continued: t.foldedThrough > 0,
      messages: fresh.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: textOf(m) })),
    })
    foldedThrough.push({ threadId: t.id, count: complete.length })
  }

  return questions.length ? { data: { questions }, foldedThrough } : null
}
