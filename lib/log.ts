import 'server-only'

interface Issue { path: string, code?: string, message?: string }

function issuesOf(error: unknown): Issue[] | null {
  const issues = (error as { issues?: unknown })?.issues
  if (!Array.isArray(issues))
    return null
  return issues.map((i: { path?: PropertyKey[], code?: string, message?: string }) => ({ path: (i.path ?? []).map(String).join('.'), code: i.code, message: i.message }))
}

/**
 * SDK validation messages read "Type validation failed: Value: {the whole input}.\nError message: {the issues}";
 * the input is model output built from the learner's conversation, so it's cut and the issues kept.
 */
export function redact(message: string) {
  let out = message
  for (let at = out.indexOf('Value: '); at !== -1; at = out.indexOf('Value: ', at + 1)) {
    const end = out.indexOf('Error message:', at)
    out = `${out.slice(0, at)}Value: [redacted].\n${end === -1 ? '' : out.slice(end)}`
  }
  return out.slice(0, 1000)
}

/**
 * An error and its causes, safe for the logs: each one's name, and either its validation issues (which field,
 * what rule) or its message, with any rejected value redacted. Tool errors can arrive as a plain string, so a
 * string gets the same treatment.
 */
export function describeError(error: unknown) {
  const chain: { name: string, message?: string }[] = []
  let issues: Issue[] | null = null
  for (let e: unknown = error, depth = 0; e && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
    issues ??= issuesOf(e)
    chain.push({ name: e instanceof Error ? e.name : typeof e, message: redact(e instanceof Error ? e.message : String(e)) })
  }
  return issues ? { chain: chain.map(c => c.name), issues } : { chain }
}

/** One line per failure in the server logs (Vercel's runtime logs), searchable by `event`. */
export function logError(event: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(event, JSON.stringify({ ...context, error: describeError(error) }))
}

/**
 * For streamText's onStepFinish: logs each tool call that failed in a step. The model sees the error and carries
 * on, so without this a broken tool (a bad input, a failed save) never shows up anywhere.
 */
export function logToolErrors(context: Record<string, unknown>) {
  return ({ content }: { content: ReadonlyArray<{ type: string, toolName?: string, error?: unknown }> }) => {
    for (const part of content) {
      if (part.type === 'tool-error')
        console.warn('tool failed', JSON.stringify({ ...context, tool: part.toolName, error: describeError(part.error) }))
    }
  }
}
