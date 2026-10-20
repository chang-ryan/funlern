'use client'

import type { ReactNode } from 'react'
import type { LearnerQuiz } from '@/lib/db/quizzes'
import type { QuizEnd } from '@/lib/quiz'
import { useEffect, useState } from 'react'
import { answerQuiz, getQuiz } from '@/app/actions'
import { tallyText } from '@/lib/quiz'

type Question = LearnerQuiz['questions'][number]

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * A quiz the tutor wrote. The quiz lives in the database: each pick is graded by the server, which then
 * reveals the answer and explanation. Finishing or exiting sends the results to the tutor (`onEnd`).
 * `phase` comes from the conversation: 'ending' while the results are on their way, 'ended' after.
 */
export function QuizCard({ quizId, phase, onEnd }: {
  /** Absent while the tutor is still writing the quiz. */
  quizId?: string
  phase: 'active' | 'ending' | 'ended'
  /** Absent while the chat is busy. */
  onEnd?: (status: QuizEnd) => void
}) {
  const [quiz, setQuiz] = useState<LearnerQuiz | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [at, setAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Load on mount, and again once the quiz has ended, to show every answer.
  useEffect(() => {
    if (!quizId || phase === 'ending')
      return
    let live = true
    getQuiz(quizId).then(
      q => live && (q ? setQuiz(q) : setFailed('This quiz is gone.')),
      () => live && setFailed('Couldn\'t load the quiz.'),
    )
    return () => {
      live = false
    }
  }, [quizId, phase])

  if (!quizId)
    return <Frame><p className="text-sm text-muted">Writing your quiz…</p></Frame>
  if (!quiz)
    return <Frame><p className="text-sm text-muted">{failed ?? 'Loading the quiz…'}</p></Frame>
  if (phase === 'ending')
    return <Frame title={quiz.title}><p className="text-sm text-muted">Sending your results to the tutor…</p></Frame>
  if (quiz.status !== 'active')
    return <Results quiz={quiz} />

  const { questions } = quiz
  // Resume at the first unanswered question.
  const index = at ?? Math.max(0, questions.findIndex(q => q.picked === null))
  const q = questions[index]
  const answered = q.picked !== null
  const allAnswered = questions.every(x => x.picked !== null)

  async function pick(choice: number) {
    // Stay on this question to show the feedback; otherwise "first unanswered" would move on at once.
    setAt(index)
    setSaving(true)
    setFailed(null)
    try {
      const result = await answerQuiz(q.id, choice)
      setQuiz(current => current && { ...current, questions: current.questions.with(index, { ...q, ...result }) })
    }
    catch {
      setFailed('Couldn\'t save that answer. Try again.')
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <Frame
      title={quiz.title}
      aside={(
        <>
          <span>{`${index + 1} of ${questions.length}`}</span>
          <button type="button" disabled={!onEnd} onClick={() => onEnd?.('exited')} className="rounded-md px-1.5 py-0.5 hover:bg-border hover:text-foreground disabled:opacity-50">
            Exit quiz
          </button>
        </>
      )}
    >
      <div className="flex gap-1" aria-hidden>
        {questions.map((x, i) => <span key={x.id} className={`h-1 flex-1 rounded-full ${segmentColor(x, i === index)}`} />)}
      </div>
      <p className="mt-4 text-[15px] font-medium"><Inline text={q.question} /></p>
      <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Choices">
        {q.choices.map((choice, i) => (
          <button
            key={choice}
            type="button"
            disabled={answered || saving}
            onClick={() => pick(i)}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-[15px] transition-colors ${choiceStyle(i, q)}`}
          >
            <span className="mt-px w-4 shrink-0 text-xs font-semibold text-muted">{LETTERS[i]}</span>
            <span className="min-w-0 flex-1"><Inline text={choice} /></span>
            {answered && i === q.answer && <span className="text-xs font-medium text-correct">Correct</span>}
            {answered && i === q.picked && i !== q.answer && <span className="text-xs font-medium text-incorrect">Your answer</span>}
          </button>
        ))}
      </div>
      {failed && <p className="mt-3 text-sm text-incorrect">{failed}</p>}
      {answered && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted">
            <span className={`font-medium ${q.picked === q.answer ? 'text-correct' : 'text-incorrect'}`}>{q.picked === q.answer ? 'Right. ' : 'Not quite. '}</span>
            <Inline text={q.explanation ?? ''} />
          </p>
          {allAnswered
            ? (
                <button type="button" disabled={!onEnd} onClick={() => onEnd?.('completed')} className="self-end rounded-lg bg-student px-3 py-1.5 text-sm font-medium text-student-foreground disabled:opacity-50">
                  Finish quiz
                </button>
              )
            : (
                <button type="button" onClick={() => setAt(nextUnanswered(questions, index))} className="self-end rounded-lg bg-student px-3 py-1.5 text-sm font-medium text-student-foreground">
                  Next question
                </button>
              )}
        </div>
      )}
    </Frame>
  )
}

function Results({ quiz }: { quiz: LearnerQuiz }) {
  const items = quiz.questions.map(q => ({ picked: q.picked, answer: q.answer ?? -1 }))
  return (
    <Frame title={quiz.title} aside={<span>{`${quiz.status === 'exited' ? 'Exited' : 'Finished'} · ${tallyText(items)}`}</span>}>
      <ol className="flex flex-col gap-3">
        {quiz.questions.map((q) => {
          const outcome = q.picked === null ? 'skipped' : q.picked === q.answer ? 'right' : 'wrong'
          return (
            <li key={q.id} className="flex gap-2.5 text-sm">
              <span className={`mt-px w-3 shrink-0 font-semibold ${outcome === 'right' ? 'text-correct' : outcome === 'wrong' ? 'text-incorrect' : 'text-muted'}`} aria-label={outcome}>
                {outcome === 'right' ? '✓' : outcome === 'wrong' ? '✗' : '–'}
              </span>
              <div className="min-w-0">
                <p><Inline text={q.question} /></p>
                {outcome !== 'right' && q.answer !== undefined && (
                  <p className="mt-0.5 text-muted">
                    {outcome === 'skipped'
                      ? 'Skipped. '
                      : (
                          <>
                            {'You picked '}
                            <Inline text={q.choices[q.picked!]} />
                            {'. '}
                          </>
                        )}
                    {'Answer: '}
                    <Inline text={q.choices[q.answer]} />
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </Frame>
  )
}

function Frame({ title, aside, children }: { title?: string, aside?: ReactNode, children: ReactNode }) {
  return (
    <section aria-label="Quiz" className="rounded-2xl border border-border bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold">
          Quiz
          {title && <span className="font-normal text-muted">{` · ${title}`}</span>}
        </h3>
        {aside && <div className="flex shrink-0 items-baseline gap-2 text-xs text-muted">{aside}</div>}
      </header>
      {children}
    </section>
  )
}

/** The next unanswered question after `from`, wrapping around. */
function nextUnanswered(questions: Question[], from: number) {
  const after = questions.findIndex((x, i) => i > from && x.picked === null)
  return after >= 0 ? after : questions.findIndex(x => x.picked === null)
}

function choiceStyle(i: number, q: Question) {
  if (q.picked === null)
    return 'border-border hover:bg-border disabled:hover:bg-transparent'
  if (i === q.answer)
    return 'border-correct/60 bg-correct/10'
  if (i === q.picked)
    return 'border-incorrect/60 bg-incorrect/10'
  return 'border-border opacity-60'
}

function segmentColor(q: Question, current: boolean) {
  if (q.picked === null)
    return current ? 'bg-muted' : 'bg-border'
  return q.picked === q.answer ? 'bg-correct' : 'bg-incorrect'
}

/** Quiz text is plain apart from `code` spans, which the tutor uses for identifiers and snippets. */
function Inline({ text }: { text: string }) {
  return text.split(/`([^`]+)`/).map((piece, i) => i % 2
    // eslint-disable-next-line react/no-array-index-key -- pieces of one fixed string
    ? <code key={i} className="rounded bg-border px-1 py-px font-mono text-[0.9em]">{piece}</code>
    : piece)
}
