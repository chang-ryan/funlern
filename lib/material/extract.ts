import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { extractText, getDocumentProxy } from 'unpdf'
import { transcribePrompt } from '@/lib/ai/prompts/tasks/transcribe'
import { MATERIAL_LIMITS } from '@/lib/plans/material'
import 'server-only'

// Fewer characters than this on a page means it is probably an image (a scan, a slide): transcribe it instead.
const SPARSE_PAGE = 40

// Transcription is a side task: always the fast model, whatever the learner picked for the tutor.
const TRANSCRIBE_MODEL = 'claude-haiku-5-5'

/** Why a PDF can't be extracted, worded for the learner. */
export class ExtractError extends Error {}

/**
 * A PDF's text as Markdown, with a [page N] marker before each page. Runs once, at upload. The text layer is
 * exact and free; a PDF with any page that has none goes to Claude once to be transcribed whole, up to the
 * pages Claude reads in one request.
 */
export async function extractPdf(bytes: Uint8Array): Promise<{ text: string, pages: number, transcribed: boolean }> {
  const pdf = await getDocumentProxy(bytes.slice())
  const { totalPages, text } = await extractText(pdf, { mergePages: false })
  if (text.every(page => page.trim().length >= SPARSE_PAGE))
    return { text: text.map((page, i) => `[page ${i + 1}]\n\n${page.trim()}`).join('\n\n'), pages: totalPages, transcribed: false }
  if (totalPages > MATERIAL_LIMITS.transcribePages)
    throw new ExtractError(`Some pages of this PDF have no text (scans or images), and transcribing is limited to ${MATERIAL_LIMITS.transcribePages} pages; this one has ${totalPages}.`)

  const result = await generateText({
    model: anthropic(TRANSCRIBE_MODEL),
    messages: [{ role: 'user', content: [
      { type: 'file', data: bytes, mediaType: 'application/pdf' },
      { type: 'text', text: transcribePrompt(totalPages) },
    ] }],
    providerOptions: { anthropic: { thinking: { type: 'disabled' } } },
  })
  return { text: result.text.trim(), pages: totalPages, transcribed: true }
}
