/** Models the learner can pick under the composer. Client-safe: no provider imports here. */
export const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5'] as const
export type ModelId = (typeof MODELS)[number]

/** Cookie that carries the learner's pick to every route, so the next turn uses it. */
export const MODEL_COOKIE = 'model'

export function isModelId(id: unknown): id is ModelId {
  return MODELS.includes(id as ModelId)
}

/** Readable name for a model id: 'claude-haiku-5-5' → 'Claude Haiku 5.5'. Unknown shapes show the id as is. */
export function modelLabel(id: string) {
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/.exec(id)
  if (!match)
    return id
  const [, family, major, minor] = match
  return `Claude ${family[0].toUpperCase()}${family.slice(1)} ${minor ? `${major}.${minor}` : major}`
}
