import { Streamdown } from 'streamdown'

/** A tutor reply's markdown, in main chat or a thread. */
export function TutorMarkdown({ text, streaming = false, className = 'text-[15px] leading-relaxed' }: {
  text: string
  streaming?: boolean
  className?: string
}) {
  // Repair half-written markdown only mid-stream: on a finished reply it mistakes blanks like ___ for an open emphasis.
  return <Streamdown className={className} isAnimating={streaming} parseIncompleteMarkdown={streaming}>{text}</Streamdown>
}
