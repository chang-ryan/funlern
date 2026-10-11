import type { LanguageModel } from 'ai'
import { and, eq } from 'drizzle-orm'
import { decrypt } from '@/lib/crypto'
import { db } from '@/lib/db'
import { modelConfig } from '@/lib/db/schema'
import { providers } from './providers'
import 'server-only'

export interface ResolvedModel {
  model: LanguageModel
  provider: (typeof modelConfig.$inferSelect)['provider']
}

/** Loads a user's model config (or their default) and builds the provider. Keys never leave the server. */
export async function resolveModel(userId: string, configId?: string | null): Promise<ResolvedModel> {
  const [config] = await db
    .select()
    .from(modelConfig)
    .where(
      and(
        eq(modelConfig.userId, userId),
        configId ? eq(modelConfig.id, configId) : eq(modelConfig.isDefault, true),
      ),
    )
    .limit(1)
  if (!config)
    throw new Error('No model configured')

  const apiKey = config.encryptedKey ? decrypt(config.encryptedKey) : undefined
  const baseURL = config.baseUrl ?? undefined
  return { provider: config.provider, model: providers[config.provider](config.modelId, { apiKey, baseURL }) }
}
