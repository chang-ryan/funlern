// Kept dependency-free so the DB schema can import it without pulling in provider SDKs.
export const PROVIDER_IDS = [
  'anthropic',
  'openai',
  'google',
  'deepseek',
  'moonshotai', // Kimi
  'zai', // GLM
  'openrouter',
  'openai-compatible', // Together, Fireworks, Groq, Ollama, vLLM, ...
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]
