import { describe, expect, it } from 'vitest'
import { parseDoc, planDescription, renderDoc } from './docs'

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

  it('describes a plan by the first paragraph of its goal', () => {
    expect(planDescription(renderDoc('brief', { Goal: 'Read **query plans**\nand fix them.\n\nMore later.' }))).toBe('Read query plans and fix them.')
    expect(planDescription(renderDoc('brief', { Goal: '- Pass the loop\n- Get the offer' }))).toBe('Pass the loop Get the offer')
    expect(planDescription('')).toBe('')
  })
})
