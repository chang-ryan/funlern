import type { UIMessage } from 'ai'

export function textOf(m: UIMessage) {
  return m.parts.map(p => (p.type === 'text' ? p.text : '')).join('')
}
