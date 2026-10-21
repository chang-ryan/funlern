import type { SessionStart } from '@/lib/plans/modes'

// A page that starts a session (the plan hub) navigates to /c/{newId} and hands over the first message and how
// the session starts. It lives in memory only, never the URL: a reload of an unsaved /c/{id} is an empty new chat.
// Client-safe.

export interface PendingStart {
  text: string
  start: SessionStart
  /** For the breadcrumb, before the session is saved. */
  plan?: { id: string, title: string | null }
}

const pending = new Map<string, PendingStart>()

export function setPendingStart(conversationId: string, value: PendingStart) {
  pending.set(conversationId, value)
}

/** What's waiting for this new session, if anything. Doesn't clear it: StrictMode renders twice. */
export function peekPendingStart(conversationId: string) {
  return pending.get(conversationId)
}

export function clearPendingStart(conversationId: string) {
  pending.delete(conversationId)
}
