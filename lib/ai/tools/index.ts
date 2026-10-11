import type { InferUITools, UIMessage } from 'ai'
import { askUser } from './schemas'

// The full tool set goes on every request, main and threads alike: tools sit at the front of the
// cached prefix, so threads gate with toolChoice 'none' instead of sending a smaller set.
// Server-executed tools (web_search, pinned) add their execute here.
export const tools = {
  ask_user: askUser,
}

export type FunlernTools = InferUITools<typeof tools>
export type FunlernUIMessage = UIMessage<unknown, never, FunlernTools>
