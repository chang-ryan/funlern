import { Breadcrumbs } from '@/components/breadcrumbs'

/** Any page without crumbs of its own (e.g. a 404), so a soft navigation never keeps the last page's. */
export default function OtherCrumbs() {
  return <Breadcrumbs />
}
