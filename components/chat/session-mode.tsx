import type { SessionMode, TrainingStyle } from '@/lib/plans/modes'
import { useId } from 'react'
import { sessionLabel, TRAINING_STYLE_HINT } from '@/lib/plans/modes'

/** Under the composer in a training session: which kind, with a hover tip on what training means. Learning shows nothing. */
export function SessionModeChip({ mode, style }: { mode: SessionMode, style: TrainingStyle | null }) {
  const tipId = useId()
  const label = sessionLabel(mode, style)
  if (!label)
    return null
  const tip = style
    ? `A practice rep: run by training.md's Method and marked with its Rubric, then logged. ${TRAINING_STYLE_HINT[style]}.`
    : 'This session sets up training.md with you: how a rep runs (Method) and how it\'s marked (Rubric). Reps start in your next training session.'

  return (
    <span className="group relative mt-1.5 inline-flex items-center gap-1 px-1 py-0.5 text-xs text-muted">
      {label}
      <button type="button" aria-label="What training means" aria-describedby={tipId} className="rounded-full hover:text-foreground focus-visible:text-foreground focus-visible:outline-none">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5" aria-hidden>
          <circle cx="10" cy="10" r="7.25" />
          <path d="M10 9v4.5" strokeLinecap="round" />
          <circle cx="10" cy="6.5" r=".6" fill="currentColor" />
        </svg>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-64 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {tip}
      </span>
    </span>
  )
}
