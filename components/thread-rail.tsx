'use client'

import type { ReactNode, Ref } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'

const GAP = 12

export interface RailItem {
  key: string
  /** Desired top in px, relative to the rail: where the thread's highlight sits. Null when the passage is gone. */
  top: number | null
  node: ReactNode
}

/** Desktop column of thread cards, each level with its highlight and pushed down when they overlap. */
export function ThreadRail({ items, railRef }: { items: RailItem[], railRef: Ref<HTMLDivElement> }) {
  const cardsRef = useRef(new Map<string, HTMLDivElement>())
  const innerRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef(items)
  const observerRef = useRef<ResizeObserver | null>(null)

  useLayoutEffect(() => {
    itemsRef.current = items
    layoutCards(items, cardsRef.current, innerRef.current)
  })

  // A card growing (a streaming reply) re-runs the layout without a React render.
  useEffect(() => {
    const ro = new ResizeObserver(() => layoutCards(itemsRef.current, cardsRef.current, innerRef.current))
    for (const el of cardsRef.current.values()) ro.observe(el)
    observerRef.current = ro
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={railRef} className="relative hidden w-rail shrink-0 lg:block">
      <div ref={innerRef}>
        {items.map(item => (
          <div
            key={item.key}
            ref={(el) => {
              if (!el)
                return
              cardsRef.current.set(item.key, el)
              observerRef.current?.observe(el)
              return () => {
                cardsRef.current.delete(item.key)
                observerRef.current?.unobserve(el)
              }
            }}
            className="absolute inset-x-0 top-0 transition-transform duration-150"
          >
            {item.node}
          </div>
        ))}
      </div>
    </div>
  )
}

// Positions are written straight to the DOM: sort by anchor, then push each card below the previous one.
function layoutCards(items: RailItem[], cards: Map<string, HTMLDivElement>, inner: HTMLDivElement | null) {
  let bottom = 0
  // Threads whose passage can't be found go last.
  for (const item of [...items].sort((a, b) => (a.top ?? Infinity) - (b.top ?? Infinity))) {
    const el = cards.get(item.key)
    if (!el)
      continue
    const top = Math.max(item.top ?? bottom, bottom)
    // A card's first real placement is instant; otherwise it slides in from the rail's top.
    // Later moves (cards pushing each other down) keep the transition.
    const fresh = !el.dataset.placed
    if (fresh)
      el.style.transition = 'none'
    el.style.transform = `translateY(${top}px)`
    if (fresh) {
      void el.offsetHeight
      el.style.transition = ''
      if (item.top != null)
        el.dataset.placed = '1'
    }
    bottom = top + el.offsetHeight + GAP
  }
  if (inner)
    inner.style.minHeight = `${bottom}px`
}
