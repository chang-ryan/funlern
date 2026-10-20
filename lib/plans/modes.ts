// A plan session is for learning or for training, fixed when it starts. Client-safe: the plan page picks one.

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

/** How a session is listed, e.g. "Training · Guided"; nothing for learning. */
export function sessionLabel(mode: SessionMode, style: TrainingStyle | null) {
  if (mode === 'learning')
    return undefined
  if (mode === 'mission')
    return 'Mission control'
  return style ? `Training · ${TRAINING_STYLE_LABEL[style]}` : 'Training setup'
}
