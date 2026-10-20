import type { UIMessage } from 'ai'
import type { threads } from '@/lib/db/schema'

export type ThreadData = typeof threads.$inferSelect & { messages: UIMessage[] }
