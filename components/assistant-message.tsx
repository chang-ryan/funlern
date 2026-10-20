import type { UIMessage } from 'ai'
import type { QuizEnd } from '@/lib/quiz'
import { textOf } from '@/lib/messages'
import { QUIZ_PART, quizIdOf } from '@/lib/quiz'
import { QuizCard } from './chat/quiz-card'
import { TutorMarkdown } from './chat/tutor-markdown'

/**
 * Tutor message body: a quiz card, or the text. Once the text finishes streaming (and is saved), passages
 * in it can anchor threads; the card sits outside the anchor root, so its changing text never shifts anchors.
 */
export function AssistantMessage({ message, streaming, quizPhase = 'ended', onQuizEnd }: {
  message: UIMessage
  streaming: boolean
  quizPhase?: 'active' | 'ending' | 'ended'
  onQuizEnd?: (quizId: string, status: QuizEnd) => void
}) {
  const text = textOf(message)
  const quizId = quizIdOf(message)
  return (
    <div className="flex flex-col gap-4">
      {message.parts.some(p => p.type === QUIZ_PART) && (
        <QuizCard quizId={quizId} phase={quizPhase} onEnd={quizId && onQuizEnd ? status => onQuizEnd(quizId, status) : undefined} />
      )}
      {text && (
        <div data-anchor-root={streaming ? undefined : ''} data-message-id={message.id}>
          <TutorMarkdown text={text} streaming={streaming} />
        </div>
      )}
    </div>
  )
}
