import { PlanFiles } from '@/components/plan/plan-files'
import { PlanHome } from '@/components/plan/plan-home'
import { currentModelId } from '@/lib/ai/model'
import { getPlanSessions } from '@/lib/db/plans'
import { loadPlan } from './load'

export default async function PlanPage({ params, searchParams }: PageProps<'/p/[id]'>) {
  const { id } = await params
  const { mode } = await searchParams
  const { userId, plan, docs } = await loadPlan(id)
  const [sessions, model] = await Promise.all([getPlanSessions(userId, plan.id), currentModelId()])

  return (
    <PlanHome
      plan={{ id: plan.id, title: plan.title }}
      sessions={sessions.map(s => ({ id: s.id, title: s.title, mode: s.mode, trainingStyle: s.trainingStyle, createdAt: s.createdAt }))}
      hasTraining={docs.some(d => d.kind === 'training')}
      initialMode={mode === 'training' ? 'training' : 'learning'}
      model={model}
      files={<PlanFiles planId={plan.id} docs={docs} />}
    />
  )
}
