import type { UIMessage } from 'ai'
import type { thread } from '@/lib/db/schema'

export type ThreadData = typeof thread.$inferSelect & { messages: UIMessage[] }
