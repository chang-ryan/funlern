import { generateText } from 'ai'
import { extractText, getDocumentProxy } from 'unpdf'
import { TRANSCRIBE_OUTPUT_TOKENS } from '@/lib/ai/limits'
import { NO_THINKING, taskModel } from '@/lib/ai/model'
import { transcribePrompt } from '@/lib/ai/prompts/tasks/transcribe'
import { MATERIAL_LIMITS } from '@/lib/plans/material'
import 'server-only'

// Fewer characters than this on a page means it is probably an image (a scan, a slide): transcribe it instead.
const SPARSE_PAGE = 40

/** Why a PDF can't be extracted, worded for the learner. */
export class ExtractError extends Error {}

/**
 * A PDF's text as Markdown, with a [page N] marker before each page. Runs once, at upload. The text layer is
 * exact and free; a PDF with any page that has none goes to Claude once to be transcribed whole, up to the
 * pages Claude reads in one request.
 */
export async function extractPdf(bytes: Uint8Array, beforeTranscription: () => Promise<void>): Promise<{ text: string, pages: number, transcribed: boolean }> {
  const { totalPages, text } = await readTextLayer(bytes)
  if (text.every(page => page.trim().length >= SPARSE_PAGE))
    return { text: text.map((page, i) => `[page ${i + 1}]\n\n${page.trim()}`).join('\n\n'), pages: totalPages, transcribed: false }
  if (totalPages > MATERIAL_LIMITS.transcribePages)
    throw new ExtractError(`Some pages of this PDF have no text (scans or images), and transcribing is limited to ${MATERIAL_LIMITS.transcribePages} pages; this one has ${totalPages}.`)

  await beforeTranscription()
  const result = await generateText({
    maxOutputTokens: TRANSCRIBE_OUTPUT_TOKENS,
    model: taskModel(),
    messages: [{ role: 'user', content: [
      { type: 'file', data: bytes, mediaType: 'application/pdf' },
      { type: 'text', text: transcribePrompt(totalPages) },
    ] }],
    providerOptions: NO_THINKING,
  })
  if (result.finishReason === 'length')
    throw new ExtractError('That scan is too long to transcribe: its text would be over a plan\'s material limit. Split it into smaller files.')
  return { text: result.text.trim(), pages: totalPages, transcribed: true }
}

/** A malformed or encrypted file is the learner's to fix; anything else (the model, the network) is ours. */
async function readTextLayer(bytes: Uint8Array) {
  try {
    return await extractText(await getDocumentProxy(bytes.slice()), { mergePages: false })
  }
  catch {
    throw new ExtractError('That PDF couldn\'t be read.')
  }
}
