'use client'

import type { UIMessage } from 'ai'
import type { ThreadData } from './types'
import { Streamdown } from 'streamdown'
import { textOf } from '@/lib/messages'

// TODO(mocks): selection listener + "Ask" popover → createThread({ anchor, snapshotIndex: index }),
// paint thread anchors with the CSS Custom Highlight API.
export function AssistantMessage({ message }: {
  conversationId: string
  message: UIMessage
  index: number
  threads: ThreadData[]
  onThreadCreated: (t: Omit<ThreadData, 'messages'>) => void
}) {
  return (
    <div data-message-id={message.id}>
      <Streamdown className="text-[15px] leading-relaxed">{textOf(message)}</Streamdown>
    </div>
  )
}
