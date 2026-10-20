import Link from 'next/link'
import { shortDate } from './format'

/** Rows of linked items, title on the left and date on the right, split by dividers. */
export function SessionList({ items, empty }: {
  items: { href: string, title: string, date: Date }[]
  empty: string
}) {
  if (items.length === 0)
    return <p className="py-3 text-sm text-muted">{empty}</p>
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {items.map(item => (
        <li key={item.href}>
          <Link href={item.href} className="flex items-baseline gap-4 py-3 hover:text-muted">
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <span className="shrink-0 text-xs text-muted">{shortDate(item.date)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
