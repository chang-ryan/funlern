import type { SideQuestionsData } from '@/lib/threads/side-questions'

/** Shows which side-thread exchanges a main turn carried to the tutor. */
export function SideQuestionsNote({ data }: { data: SideQuestionsData }) {
  const n = data.questions.length
  return (
    <details className="group max-w-[85%] text-right text-xs text-muted sm:max-w-[75%]">
      <summary className="cursor-pointer list-none select-none hover:text-foreground">
        {n}
        {' '}
        side question
        {n === 1 ? '' : 's'}
        {' '}
        included
        <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-left">
        {data.questions.map(q => (
          <div key={q.threadId} className="rounded-lg border border-border px-3 py-2">
            <p className="line-clamp-2 border-l-2 border-muted pl-2 italic">{q.regarding}</p>
            {q.messages.filter(m => m.role === 'user').map(m => (
              <p key={m.text} className="mt-1 text-foreground">{m.text}</p>
            ))}
          </div>
        ))}
      </div>
    </details>
  )
}
