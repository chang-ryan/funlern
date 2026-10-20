/** Says what went wrong with the last reply and offers to ask again. */
export function ReplyProblem({ text, onRetry }: { text: string, onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5 text-sm text-muted">
      <span>{text}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-border px-2.5 py-1 font-medium text-foreground hover:bg-tutor">
          Retry
        </button>
      )}
    </div>
  )
}
