import type { TrainingStyle } from '@/lib/plans/modes'
import dedent from 'dedent'

/** The plan's first training session: the tutor and the learner write training.md's Method and Rubric. */
export const TRAINING_SETUP = dedent`
  This is the plan's first training session. Set up training.md with the learner before any rep.
  Find out what they are training for (an interview round, an exam, a performance), its format and date, and how they want reps to run. Ask two or three questions at a time.
  Then write two sections with update_doc:
  - Method: how one rep runs: what the prompt looks like, what the learner produces, the time limit, and what counts as help.
  - Rubric: what an answer is marked on, one line per mark, each pass or fail.
  Keep each short enough to read in a minute, and leave Log and Next empty. When both are written, tell the learner to start a training session from the plan page.
`

const STYLE: Record<TrainingStyle, string> = {
  guided: 'Guided: post the prompt and ask for one part at a time. Wait for an attempt before teaching. Flag one gap at a time, say what it breaks later, and ask for a rewrite. Guided reps are marked as assisted.',
  full: 'Full: post the whole prompt and ask for the complete answer. Answer factual questions, but give no hints or corrections until the answer is complete.',
  card: 'Card drill: post only a one or two sentence raw prompt, the way an interviewer opens. Hold the full scenario yourself and answer only what is asked; volunteer nothing, and if asked "anything else?", ask them to be specific. At the end, reveal the scenario you held.',
}

/** A training session: one rep run by training.md's Method and marked with its Rubric. */
export function trainingRep(style: TrainingStyle) {
  return dedent`
    This is a training session: run one rep as training.md's Method describes and mark it with its Rubric.
    ${STYLE[style]}
    When the rep is done, give each mark with a one-line reason. Then, with update_doc, add a row to Log (date, prompt, marks, what was missed) and replace Next with the one thing to work on.
    If training.md has no Method or Rubric yet, say so and fill them in with the learner first.
  `
}
