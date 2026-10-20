import dedent from 'dedent'

/** Transcribes a PDF without a usable text layer (scans, image slides) into Markdown, once, at upload. */
export function transcribePrompt(pages: number) {
  return dedent`
    Transcribe this ${pages}-page PDF into Markdown, faithfully: every word, in order, nothing summarised or added.
    Start each page with a line "[page N]". Use headings, lists and tables where the page has them, and LaTeX between $ signs for formulas.
    Describe a figure in one line in square brackets only if it carries information the text doesn't.
    Reply with the transcription alone.
  `
}
