import { asSchema } from 'ai'
import { describe, expect, it } from 'vitest'
import { askUser, createQuiz, updateDoc, webSearch } from './schemas'

// Tool definitions sit at the front of the cached prefix: pin them like the prompts, so a change is on purpose.
describe('tool definitions', () => {
  it.each([['ask_user', askUser], ['create_quiz', createQuiz], ['update_doc', updateDoc], ['web_search', webSearch]] as [string, { description?: string, inputSchema: Parameters<typeof asSchema>[0] }][])('%s', async (_, tool) => {
    expect({ description: tool.description, input: await asSchema(tool.inputSchema).jsonSchema }).toMatchSnapshot()
  })
})
