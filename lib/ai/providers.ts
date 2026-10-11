import type { LanguageModel } from 'ai'
import type { ProviderId } from './provider-ids'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMoonshotAI } from '@ai-sdk/moonshotai'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createZai } from '@ai-sdk/zai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import 'server-only'

interface Settings { apiKey?: string, baseURL?: string }

// baseURL is optional everywhere: it overrides regional endpoints (e.g. api.moonshot.cn) or proxies.
export const providers: Record<ProviderId, (modelId: string, s: Settings) => LanguageModel> = {
  'anthropic': (id, s) => createAnthropic(s)(id),
  'openai': (id, s) => createOpenAI(s)(id),
  'google': (id, s) => createGoogleGenerativeAI(s)(id),
  'deepseek': (id, s) => createDeepSeek(s)(id),
  'moonshotai': (id, s) => createMoonshotAI(s)(id),
  'zai': (id, s) => createZai(s)(id),
  'openrouter': (id, s) => createOpenRouter(s).chat(id),
  'openai-compatible': (id, s) => {
    if (!s.baseURL)
      throw new Error('openai-compatible requires a base URL')
    return createOpenAICompatible({ name: 'custom', apiKey: s.apiKey, baseURL: s.baseURL })(id)
  },
}
