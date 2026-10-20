import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { extractPdf } = await import('./extract')

/** A minimal PDF with one Helvetica text line per page, so the text layer can be read without fixtures. */
function pdfWithPages(lines: string[]) {
  const objects: string[] = []
  const add = (body: string) => objects.push(body) // object number = index + 1
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('') // pages, filled in below
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const kids = lines.map((line) => {
    const stream = `BT /F1 12 Tf 72 720 Td (${line}) Tj ET`
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length} 0 R >>`)
    return `${objects.length} 0 R`
  })
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${lines.length} >>`
  let out = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const at = out.length
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
    return at
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(out)
}

describe('extractPdf', () => {
  it('reads the text layer page by page, without calling a model', async () => {
    const pdf = pdfWithPages(['A closure is a function bundled with its lexical environment.', 'Closures capture variables, not values, in JavaScript.'])
    const { text, pages, transcribed } = await extractPdf(pdf)
    expect({ pages, transcribed }).toEqual({ pages: 2, transcribed: false })
    expect(text).toMatch(/^\[page 1\]\n\nA closure is a function/)
    expect(text).toMatch(/\[page 2\]\n\nClosures capture variables/)
  })
})
