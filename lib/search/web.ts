import 'server-only'

// Tavily basic search costs 1 credit (1,000 free a month). What reaches the model is ours to size: a few results
// with short snippets, since they're billed as input on this turn and every later one.
export const SEARCH_LIMITS = { perTurn: 2, perDay: 30, results: 3, snippetChars: 600 }

export interface SearchResult { title: string, url: string, snippet: string }

// The smoke test runs on the scripted model (MOCK_MODEL=1); it gets fixed results instead of a network call.
const MOCKED = process.env.MOCK_MODEL === '1' && process.env.NODE_ENV !== 'production'

/** Searches the web for the tutor. Throws with a message fit for the model when search isn't set up or fails. */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  if (MOCKED)
    return [{ title: 'Mock result', url: 'https://example.com/mock', snippet: `Mock snippet about ${query}.` }]
  const key = process.env.TAVILY_API_KEY
  if (!key)
    throw new Error('Web search isn\'t set up (no TAVILY_API_KEY). Answer from what you know and say it may be out of date.')
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, search_depth: 'basic', max_results: SEARCH_LIMITS.results }),
  })
  if (!res.ok)
    throw new Error(`Web search failed (${res.status}). Answer from what you know and say so.`)
  const { results } = await res.json() as { results?: { title?: string, url?: string, content?: string }[] }
  return (results ?? []).slice(0, SEARCH_LIMITS.results).map(r => ({
    title: (r.title ?? r.url ?? '').slice(0, 200),
    url: r.url ?? '',
    snippet: (r.content ?? '').replace(/\s+/g, ' ').trim().slice(0, SEARCH_LIMITS.snippetChars),
  }))
}
