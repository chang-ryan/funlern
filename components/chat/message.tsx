import type { UIMessage } from 'ai'
import type { ReactNode } from 'react'
import remarkBreaks from 'remark-breaks'
import { defaultRemarkPlugins, Streamdown } from 'streamdown'
import { textOf } from '@/lib/messages'
import { quizResultsOf, tallyText } from '@/lib/quiz'
import { sideQuestionsOf } from '@/lib/threads/side-questions'
import { CopyButton } from './copy-button'
import { SideQuestionsNote } from './side-questions-note'
import { TutorAvatar } from './tutor-avatar'
import { TutorMarkdown } from './tutor-markdown'

// Learners write markdown, but a newline they type is a line break, not a soft wrap.
const STUDENT_REMARK_PLUGINS = [...Object.values(defaultRemarkPlugins), remarkBreaks]

/** Tutor (assistant) messages: avatar, then the reply at full width with no bubble, then a copy button shown on hover. Student (user) messages are bubbles on the right. */
export function Message({ message, streaming, children }: {
  message: UIMessage
  streaming?: boolean
  children?: ReactNode
}) {
  if (message.role === 'user') {
    const side = sideQuestionsOf(message)
    const results = quizResultsOf(message)
    return (
      <div className="flex flex-col items-end gap-1.5">
        {side && <SideQuestionsNote data={side} />}
        {results
          ? (
              // Sent when the learner ends a quiz. The optimistic copy has no items until the page reloads.
              <p className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                {results.status === 'exited' ? 'Exited the quiz' : 'Finished the quiz'}
                {results.items && ` · ${tallyText(results.items)}`}
              </p>
            )
          : (
              <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-md bg-student px-4 py-2.5 text-student-foreground sm:max-w-[75%]">
                <Streamdown mode="static" parseIncompleteMarkdown={false} remarkPlugins={STUDENT_REMARK_PLUGINS} className="text-[15px] leading-relaxed">
                  {textOf(message)}
                </Streamdown>
              </div>
            )}
      </div>
    )
  }

  return (
    <div className="group/reply flex items-start gap-3">
      <TutorAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        {children ?? <TutorMarkdown text={textOf(message)} streaming={streaming} />}
        {/* Hidden, not removed, so hovering doesn't shift the transcript. Always shown where there's no hover (touch). */}
        {!streaming && textOf(message) && (
          <div className="-ml-1.5 opacity-0 transition-opacity group-hover/reply:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
            <CopyButton text={textOf(message)} />
          </div>
        )}
      </div>
    </div>
  )
}

export function Typing() {
  return (
    <div className="flex items-start gap-3" aria-label="Tutor is typing">
      <TutorAvatar />
      <div className="flex gap-1 py-3.5">
        {[0, 150, 300].map(d => (
          <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}
