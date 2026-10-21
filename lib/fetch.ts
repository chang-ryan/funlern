// Routes report failures as `{ error }` (lib/auth.ts). Client-safe.

/** fetch that throws a failed response's `error` message, so chat transports show it rather than raw JSON. */
export async function fetchOrThrow(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init)
  if (res.ok)
    return res
  const body = await res.json().catch(() => null) as { error?: string } | null
  throw new Error(body?.error ?? `Request failed (${res.status}).`)
}
