import type { ReactNode } from 'react'
import { Breadcrumbs, Crumb, CrumbLink } from '@/components/breadcrumbs'
import { UNTITLED_PLAN } from './format'

/** A page inside a plan: the plan, then the page. */
export function PlanCrumbs({ plan, children }: { plan: { id: string, title: string | null }, children: ReactNode }) {
  return (
    <Breadcrumbs>
      <CrumbLink href={`/p/${plan.id}`}>{plan.title ?? UNTITLED_PLAN}</CrumbLink>
      <Crumb>{children}</Crumb>
    </Breadcrumbs>
  )
}
