// A plan's docs have fixed headings, so the tutor and the learner always know where things go, and a change
// can be sent as just the sections it touched. Client-safe: the drawer renders and edits by section.

export const DOC_KINDS = ['brief', 'syllabus', 'training'] as const
export type DocKind = (typeof DOC_KINDS)[number]

export const DOC_FILE: Record<DocKind, string> = { brief: 'brief.md', syllabus: 'syllabus.md', training: 'training.md' }

export const DOC_SECTIONS = {
  brief: ['Goal', 'Why', 'Level', 'Seriousness', 'Constraints'],
  syllabus: ['Units', 'Notes'],
  training: ['Method', 'Rubric', 'Log', 'Next'],
} as const satisfies Record<DocKind, readonly string[]>

export type Section<K extends DocKind> = (typeof DOC_SECTIONS)[K][number]
export type Sections<K extends DocKind = DocKind> = Partial<Record<Section<K>, string>>

/** A doc's markdown: each section under its `##` heading, in template order, empty ones kept. */
export function renderDoc<K extends DocKind>(kind: K, sections: Sections<K>) {
  return DOC_SECTIONS[kind]
    .map((name: Section<K>) => `## ${name}\n\n${(sections[name] ?? '').trim()}`.trim())
    .join('\n\n')
    .concat('\n')
}

/** Splits a doc into its template sections. Text under an unknown heading stays with the section above it. */
export function parseDoc<K extends DocKind>(kind: K, body: string): Sections<K> {
  const names = new Set<string>(DOC_SECTIONS[kind])
  const sections: Record<string, string[]> = {}
  let current: string | null = null
  for (const line of body.split('\n')) {
    const heading = line.match(/^## (\S.*)$/)?.[1].trim()
    if (heading && names.has(heading)) {
      current = heading
      sections[current] = []
    }
    else if (current) {
      sections[current].push(line)
    }
  }
  return Object.fromEntries(Object.entries(sections).map(([name, lines]) => [name, lines.join('\n').trim()])) as Sections<K>
}
