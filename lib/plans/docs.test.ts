import { describe, expect, it } from 'vitest'
import { parseDoc, renderDoc } from './docs'

describe('plan docs', () => {
  it('renders every section in template order', () => {
    expect(renderDoc('syllabus', { Notes: 'later', Units: '- [ ] Closures' })).toBe('## Units\n\n- [ ] Closures\n\n## Notes\n\nlater\n')
    expect(renderDoc('syllabus', {})).toBe('## Units\n\n## Notes\n')
  })

  it('parses what it renders', () => {
    const sections = { Goal: 'Pass the loop', Why: 'New job', Level: 'some', Seriousness: 'serious', Constraints: '' }
    expect(parseDoc('brief', renderDoc('brief', sections))).toEqual(sections)
  })

  it('keeps unknown headings inside the section above', () => {
    expect(parseDoc('syllabus', '## Units\n\n- [ ] A\n\n## Extra\n\nx\n\n## Notes\n\nn')).toEqual({ Units: '- [ ] A\n\n## Extra\n\nx', Notes: 'n' })
  })
})
