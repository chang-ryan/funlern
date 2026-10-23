import { generateText, Output } from 'ai'
import { z } from 'zod'
import { setGeneratedTitle } from '@/lib/db/queries'
import { logError } from '@/lib/log'
import { NO_THINKING, taskModel } from './model'
import { titlePrompt } from './prompts/tasks/title'
import 'server-only'

/**
 * Names a new conversation from the learner's first message and saves it, unless the learner has
 * renamed it meanwhile. Resolves to the saved title, or null; never throws, since a title is optional.
 */
export async function titleConversation(conversationId: string, question: string) {
  try {
    const { output } = await generateText({
      model: taskModel(),
      maxOutputTokens: 128,
      output: Output.object({ schema: z.object({ title: z.string() }) }),
      prompt: titlePrompt(question.slice(0, 2000)),
      providerOptions: NO_THINKING,
    })
    const title = output.title.trim().replace(/^["']|["'.]$/g, '').slice(0, 80)
    return title && await setGeneratedTitle(conversationId, title) ? title : null
  }
  catch (error) {
    logError('title failed', error, { conversationId })
    return null
  }
}
