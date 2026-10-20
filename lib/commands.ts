/** Slash commands offered in the main composer. The chat route runs /quiz-me (lib/ai/commands.ts); the rest reach the tutor as plain text for now. */
export interface Command {
  name: string
  label: string
  icon: 'quiz' | 'guide'
}

export const COMMANDS: Command[] = [
  { name: 'quiz-me', label: 'Quiz Me', icon: 'quiz' },
  { name: 'create-study-guide', label: 'Create Study Guide', icon: 'guide' },
]

// 'Quiz Me', 'quiz-me' and 'quizme' all become 'quizme', so the label and the command both match.
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Commands the menu should list for the composer's text, or null when the menu shouldn't show: the text
 * isn't a one-line '/…', or a command has already been picked and is followed by a space.
 */
export function commandMatches(text: string, commands = COMMANDS): Command[] | null {
  if (!text.startsWith('/') || text.includes('\n'))
    return null
  const typed = text.slice(1)
  if (commands.some(c => typed.startsWith(`${c.name} `)))
    return null
  const query = squash(typed)
  const matches = commands.filter(c => squash(c.label).includes(query) || squash(c.name).includes(query))
  return matches.length ? matches : null
}
