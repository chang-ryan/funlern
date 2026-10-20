import type { Anchor } from '@/lib/db/schema'

// Anchors store the quoted text plus a little context on each side, so they survive re-rendering
// and pick the right occurrence when the same words appear twice in a message.
const CONTEXT = 32

/** Turns a selection inside `root` into an anchor, or null if it is empty. */
export function anchorFromRange(root: Node, range: Range): Anchor | null {
  const before = document.createRange()
  before.selectNodeContents(root)
  before.setEnd(range.startContainer, range.startOffset)

  const raw = range.toString()
  const quote = raw.trim()
  if (!quote)
    return null
  const start = before.toString().length + (raw.length - raw.trimStart().length)
  const text = root.textContent ?? ''
  return {
    quote,
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(start + quote.length, start + quote.length + CONTEXT),
  }
}

/** Character offset of the best match for `anchor` in `text`, or -1. Ties go to the earliest match. */
export function locateAnchor(text: string, anchor: Anchor) {
  let best = -1
  let bestScore = -1
  for (let i = text.indexOf(anchor.quote); i !== -1; i = text.indexOf(anchor.quote, i + 1)) {
    const score = sharedSuffix(text.slice(0, i), anchor.prefix) + sharedPrefix(text.slice(i + anchor.quote.length), anchor.suffix)
    if (score > bestScore) {
      best = i
      bestScore = score
    }
  }
  return best
}

/** Finds the anchor inside `root` and returns a DOM range over it, or null if the text is gone. */
export function rangeFromAnchor(root: Node, anchor: Anchor): Range | null {
  const nodes: { node: Text, start: number }[] = []
  let text = ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    nodes.push({ node, start: text.length })
    text += node.data
  }

  const start = locateAnchor(text, anchor)
  if (start < 0)
    return null
  const end = start + anchor.quote.length

  const range = document.createRange()
  const first = nodes.find(n => start < n.start + n.node.length)!
  const last = nodes.find(n => end <= n.start + n.node.length)!
  range.setStart(first.node, start - first.start)
  range.setEnd(last.node, end - last.start)
  return range
}

function sharedSuffix(a: string, b: string) {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n])
    n++
  return n
}

function sharedPrefix(a: string, b: string) {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n])
    n++
  return n
}
