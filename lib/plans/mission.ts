// Mission control: the plan's one ongoing session for shaping the plan. Client-safe.

/** First messages offered on an empty mission control. */
export function missionSuggestions({ hasTraining, materials }: { hasTraining: boolean, materials: number }) {
  return [
    'Walk me through my plan',
    'Make my goal more concrete',
    'Tighten the syllabus order',
    hasTraining ? 'Review my training setup' : 'Help me set up training',
    ...(materials ? ['Check the syllabus against my material'] : []),
  ]
}
