import type { UIMessage } from 'ai'
import type { DocKind, Sections } from './docs'
import { escape, tag } from '@/lib/ai/prompts/xml'
import { DOC_FILE, parseDoc } from './docs'

// Doc changes the tutor hasn't seen (the learner's edits, writes from other sessions) ride on the next
// learner message as this part, so the session's system prompt never changes mid-session.
export const PLAN_UPDATED = 'data-plan-updated'

export interface PlanUpdate {
  docs: { kind: DocKind, version: number, sections: Sections }[]
  /** Material added (with its text) or deleted since the tutor last saw the plan's files. */
  materials?: { added: { id: string, name: string, text: string }[], removed: { id: string, name: string }[] }
}

export function planUpdateOf(m: UIMessage): PlanUpdate | undefined {
  const part = m.parts.find(p => p.type === PLAN_UPDATED)
  return part && 'data' in part ? part.data as PlanUpdate : undefined
}

/** The sections of `after` that differ from `before`; a removed section comes back empty. */
export function changedSections(kind: DocKind, before: string, after: string): Sections {
  const was: Record<string, string | undefined> = parseDoc(kind, before)
  const now: Record<string, string | undefined> = parseDoc(kind, after)
  const names = new Set([...Object.keys(was), ...Object.keys(now)])
  return Object.fromEntries([...names].filter(n => (was[n] ?? '') !== (now[n] ?? '')).map(n => [n, now[n] ?? '']))
}

/** How the model sees doc and material changes, ahead of the learner's text. */
export function renderPlanUpdate({ docs, materials }: PlanUpdate) {
  const body = [
    ...docs.map((d) => {
      const sections = Object.entries(d.sections).map(([name, text]) => `## ${name}\n\n${escape(text ?? '') || '(now empty)'}`).join('\n\n')
      return `<doc name="${DOC_FILE[d.kind]}" version="${d.version}">\n${sections}\n</doc>`
    }),
    ...(materials?.added ?? []).map(m => tag('material', { name: m.name, added: true }, m.text)),
    ...(materials?.removed ?? []).map(m => tag('material', { name: m.name, removed: true }, 'The learner deleted this file; don\'t rely on it any more.')),
  ].join('\n')
  return `<plan_updated>\n${body}\n</plan_updated>`
}
