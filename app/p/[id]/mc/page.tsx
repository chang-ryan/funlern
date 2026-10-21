import { Conversation } from '@/components/conversation'
import { MissionIntro } from '@/components/plan/mission-intro'
import { currentModelId } from '@/lib/ai/model'
import { getMissionSession } from '@/lib/db/plans'
import { getMessages, getThreadMessages, getThreads } from '@/lib/db/queries'
import { missionSuggestions } from '@/lib/plans/mission'
import { MISSION_TITLE } from '@/lib/plans/modes'
import { loadPlan } from '../load'

// Sent when a page links here to do something, e.g. Set up training.
const ACTIONS: Record<string, string> = { 'setup-training': 'Let\'s set up training for this plan.' }

/**
 * Mission control: the plan's one ongoing session for shaping the plan itself. It is created by its first
 * message and always lives at this URL. A new plan lands here.
 */
export default async function MissionControlPage({ params, searchParams }: PageProps<'/p/[id]/mc'>) {
  const { id } = await params
  const { do: action } = await searchParams
  const { userId, plan, docs, materials } = await loadPlan(id)
  const [mission, model] = await Promise.all([getMissionSession(userId, plan.id), currentModelId()])
  const firstMessage = typeof action === 'string' ? ACTIONS[action] : undefined
  const common = {
    mode: 'mission' as const,
    title: MISSION_TITLE,
    plan: { id: plan.id, title: plan.title },
    model,
    firstMessage,
    stayOnPage: true,
    // Stays above the conversation, refreshed after each reply.
    intro: <MissionIntro planId={plan.id} docs={docs} materials={materials.length} />,
    suggestions: missionSuggestions({ hasTraining: docs.some(d => d.kind === 'training'), materials: materials.length }),
  }

  if (!mission) {
    return (
      <Conversation
        {...common}
        id={crypto.randomUUID()}
        isNew
        start={{ planId: plan.id, mode: 'mission' }}
        initialMessages={[]}
        initialThreads={[]}
      />
    )
  }

  const [messages, threads] = await Promise.all([getMessages(mission.id), getThreads(mission.id)])
  const threadsWithMessages = await Promise.all(threads.map(async t => ({ ...t, messages: await getThreadMessages(t.id) })))
  return <Conversation {...common} id={mission.id} initialMessages={messages} initialThreads={threadsWithMessages} />
}
