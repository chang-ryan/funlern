import type { UIMessage } from 'ai'
import type { DocKind } from '@/lib/plans/docs'
import type { QuizEnd } from '@/lib/quiz'
import { textOf } from '@/lib/messages'
import { DOC_FILE } from '@/lib/plans/docs'
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
  const sources = searchResults(message)
  return (
    <div className="flex flex-col gap-4">
      {message.parts.some(p => p.type === QUIZ_PART) && (
        <QuizCard quizId={quizId} phase={quizPhase} onEnd={quizId && onQuizEnd ? status => onQuizEnd(quizId, status) : undefined} />
      )}
      {docWrites(message).map(w => (
        <p key={w.id} className="text-xs text-muted">{`Updated ${DOC_FILE[w.doc]} · ${w.summary}`}</p>
      ))}
      {text && (
        <div data-anchor-root={streaming ? undefined : ''} data-message-id={message.id}>
          <TutorMarkdown text={text} streaming={streaming} />
        </div>
      )}
      {sources.length > 0 && (
        <details className="group text-xs text-muted">
          <summary className="cursor-pointer list-none select-none hover:text-foreground">
            {`Searched the web · ${sources.length} source${sources.length === 1 ? '' : 's'}`}
            <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {sources.map(s => (
              <li key={s.url} className="truncate">
                <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">{s.title || s.url}</a>
                <span className="ml-2 text-muted/70">{hostOf(s.url)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/** The distinct pages the tutor's web searches in this reply returned. */
function searchResults(message: UIMessage) {
  const seen = new Map<string, { title: string, url: string }>()
  for (const p of message.parts) {
    if (p.type === 'tool-web_search' && 'state' in p && p.state === 'output-available') {
      for (const r of (p.output as { results: { title: string, url: string }[] }).results)
        seen.set(r.url, r)
    }
  }
  return [...seen.values()]
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
}

/** The plan doc sections the tutor rewrote in this reply (update_doc calls that saved). */
function docWrites(message: UIMessage) {
  return message.parts.flatMap(p => p.type === 'tool-update_doc' && 'state' in p && p.state === 'output-available'
    ? [{ id: p.toolCallId, ...(p.input as { doc: DocKind, summary: string }) }]
    : [])
}
