// What a session is for, fixed when it starts: learning, training reps, or the plan's mission control. Every rule
// that depends on the mode lives here. Client-safe: the plan page picks one.

export const SESSION_MODES = ['learning', 'training', 'mission'] as const
export type SessionMode = (typeof SESSION_MODES)[number]

export const TRAINING_STYLES = ['guided', 'full', 'card'] as const
export type TrainingStyle = (typeof TRAINING_STYLES)[number]

export const TRAINING_STYLE_LABEL: Record<TrainingStyle, string> = { guided: 'Guided', full: 'Full', card: 'Card drill' }

export const TRAINING_STYLE_HINT: Record<TrainingStyle, string> = {
  guided: 'One step at a time, with feedback before the next',
  full: 'The whole rep cold, feedback at the end',
  card: 'Only a raw prompt: you ask for what you need',
}

/** How a new session starts: in a plan or not, and for learning or training. Ignored once the session exists. */
export interface SessionStart { planId?: string, mode?: SessionMode, style?: TrainingStyle }

export const MISSION_TITLE = 'Mission control'

/**
 * How a new session starts. Training needs a plan with training.md (mission control sets it up); without it a
 * training start is a learning session. Mission control has a fixed title.
 */
export function resolveStart(start: SessionStart, plan: { hasTraining: boolean } | null) {
  const mode: SessionMode = !plan ? 'learning' : start.mode === 'mission' ? 'mission' : start.mode === 'training' && plan.hasTraining ? 'training' : 'learning'
  return {
    mode,
    trainingStyle: mode === 'training' ? (start.style ?? 'guided') : null,
    title: mode === 'mission' ? MISSION_TITLE : null,
  }
}

/** training.md is written by training sessions and mission control, never by learning ones. */
export function canWriteTraining(mode: SessionMode | undefined) {
  return mode === 'training' || mode === 'mission'
}

/** Mission control always opens on its plan's page (/p/[id]/mc), never as /c/{id}. */
export function livesOnPlanPage(mode: SessionMode) {
  return mode === 'mission'
}

/** How a session is listed, e.g. "Training · Guided"; nothing for learning. */
export function sessionLabel(mode: SessionMode, style: TrainingStyle | null) {
  if (mode === 'learning')
    return undefined
  if (mode === 'mission')
    return MISSION_TITLE
  return style ? `Training · ${TRAINING_STYLE_LABEL[style]}` : 'Training setup'
}

/** The hover tip on a session's label: what the session is for. */
export function sessionTip(mode: SessionMode, style: TrainingStyle | null) {
  if (mode === 'mission')
    return { label: 'What mission control is', text: 'The one ongoing session for shaping this plan: its brief, syllabus and training.md. Study in learning sessions.' }
  return {
    label: 'What training means',
    text: style
      ? `A practice rep: run by training.md's Method and marked with its Rubric, then logged. ${TRAINING_STYLE_HINT[style]}.`
      : 'This session sets up training.md with you: how a rep runs (Method) and how it\'s marked (Rubric). Reps start in your next training session.',
  }
}
