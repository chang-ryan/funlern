import type { PlanDoc } from '@/lib/db/plans'
import dedent from 'dedent'
import { DOC_FILE, DOC_KINDS } from '@/lib/plans/docs'

/**
 * A plan session's docs, appended to the system prompt. Built from the versions pinned when the session
 * started, so it stays byte-identical, and cached, for the whole session.
 */
export function planBlock(docs: PlanDoc[]) {
  const files = DOC_KINDS
    .map(kind => docs.find(d => d.kind === kind))
    .filter(d => d !== undefined)
    .map(d => `<doc name="${DOC_FILE[d.kind]}">\n${d.body.trim()}\n</doc>`)
    .join('\n')
  return dedent`
    This session belongs to the learner's study plan. Its docs follow inside <plan>: brief.md says what they want and why, syllabus.md the units in order, and training.md, once set up, how practice reps run and how past ones went. Teach towards the brief, follow the syllabus unless the learner steers elsewhere, and pitch it at their level and seriousness. When a doc changes during the session, the changed sections arrive inside <plan_updated> before the learner's next message and replace those sections above.

    Keep the docs current with update_doc, at natural points only: after quiz results, when a unit is done, or when the learner asks. Tick a unit off ("- [x]") rather than deleting it. Never call create_quiz yourself; quizzes start when the learner types /quiz-me.

    <plan>
    ${files}
    </plan>
  `
}
