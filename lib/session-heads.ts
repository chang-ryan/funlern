import { useSyncExternalStore } from 'react'

// What a session's crumb shows, shared between the conversation (which learns its generated title and when it's
// saved, mid-stream) and the crumb in the layout's top bar, which can rename it. Client-side only: on the
// server, and until something changes, each reader sees the values its page loaded. Client-safe.

export interface SessionHead { title: string | null, saved: boolean }

const heads = new Map<string, Partial<SessionHead>>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setSessionHead(id: string, patch: Partial<SessionHead>) {
  heads.set(id, { ...heads.get(id), ...patch })
  listeners.forEach(l => l())
}

/** A generated title, kept only if the session has none yet (a rename wins). */
export function offerSessionTitle(id: string, title: string) {
  if (heads.get(id)?.title == null)
    setSessionHead(id, { title })
}

/** The session's latest title and saved state, falling back to what the page loaded. */
export function useSessionHead(id: string, loaded: SessionHead): SessionHead {
  const head = useSyncExternalStore(subscribe, () => heads.get(id), () => undefined)
  return { title: head?.title !== undefined ? head.title : loaded.title, saved: head?.saved ?? loaded.saved }
}
