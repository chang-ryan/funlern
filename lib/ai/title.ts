import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { setGeneratedTitle } from '@/lib/db/queries'
import { titlePrompt } from './prompts/tasks/title'
import 'server-only'

// Titles are a small side task: always the fast model, whatever the learner picked for the tutor.
const TITLE_MODEL = 'claude-haiku-5-5'

/**
 * Names a new conversation from the learner's first message and saves it, unless the learner has
 * renamed it meanwhile. Resolves to the saved title, or null; never throws, since a title is optional.
 */
export async function titleConversation(conversationId: string, question: string) {
  try {
    const { output } = await generateText({
      model: anthropic(TITLE_MODEL),
      output: Output.object({ schema: z.object({ title: z.string() }) }),
      prompt: titlePrompt(question.slice(0, 2000)),
      providerOptions: { anthropic: { thinking: { type: 'disabled' } } },
    })
    const title = output.title.trim().replace(/^["']|["'.]$/g, '').slice(0, 80)
    return title && await setGeneratedTitle(conversationId, title) ? title : null
  }
  catch (error) {
    console.error('title failed', error)
    return null
  }
}
