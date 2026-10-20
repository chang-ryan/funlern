import { describe, expect, it } from 'vitest'
import { renderDoc } from './docs'
import { changedSections, renderPlanUpdate } from './updates'

describe('plan updates', () => {
  it('keeps only the sections that changed', () => {
    const before = renderDoc('syllabus', { Units: '- [ ] A\n- [ ] B', Notes: 'n' })
    const after = renderDoc('syllabus', { Units: '- [x] A\n- [ ] B', Notes: 'n' })
    expect(changedSections('syllabus', before, after)).toEqual({ Units: '- [x] A\n- [ ] B' })
    expect(changedSections('syllabus', after, after)).toEqual({})
  })

  it('treats a first version as all new', () => {
    expect(changedSections('syllabus', '', renderDoc('syllabus', { Units: '- [ ] A' }))).toEqual({ Units: '- [ ] A' })
  })

  it('renders escaped sections, marking emptied ones', () => {
    expect(renderPlanUpdate({ docs: [{ kind: 'brief', version: 3, sections: { Goal: 'Use <T>', Constraints: '' } }] }))
      .toBe('<plan_updated>\n<doc name="brief.md" version="3">\n## Goal\n\nUse &lt;T&gt;\n\n## Constraints\n\n(now empty)\n</doc>\n</plan_updated>')
  })
})
