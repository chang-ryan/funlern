import type { UIMessage, UIMessageStreamWriter } from 'ai'
import { createUIMessageStream, createUIMessageStreamResponse, generateId, generateText, streamText, toUIMessageStream, validateUIMessages } from 'ai'
import { after } from 'next/server'
import { markCacheBreakpoint } from '@/lib/ai/cache'
import { parseCommand } from '@/lib/ai/commands'
import { toModelMessages } from '@/lib/ai/messages'
import { currentModel } from '@/lib/ai/model'
import { finishMetadata, saveReplyWhenDone } from '@/lib/ai/reply'
import { systemFor } from '@/lib/ai/system'
import { titleConversation } from '@/lib/ai/title'
import { TOOL_CHOICE, toolsFor } from '@/lib/ai/tools'
import { placeTurn } from '@/lib/ai/turn'
import { foldPlanUpdates, setSeen } from '@/lib/db/plans'
import { deleteMessagesFrom, getMessages, getOrStartConversation, getThreadsWithMessages, saveMessages, setFoldedThrough } from '@/lib/db/queries'
import { endQuiz, exitActiveQuizzes, getActiveQuizId, getLearnerQuiz } from '@/lib/db/quizzes'
import { textOf, TITLE_PART } from '@/lib/messages'
import { PLAN_UPDATED } from '@/lib/plans/updates'
import { QUIZ_PART, QUIZ_RESULTS, quizIdOf, quizResultsOf } from '@/lib/quiz'
import { getUserId } from '@/lib/supabase/server'
import { foldThreads } from '@/lib/threads/fold'
import { SIDE_QUESTIONS } from '@/lib/threads/side-questions'

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { id, message, planId }: { id: string, message: UIMessage, planId?: string } = await req.json()
  const convo = await getOrStartConversation(userId, id, planId)
  if (!convo)
    return new Response('Not found', { status: 404 })
  if (message.role !== 'user')
    return new Response('Only learner messages', { status: 400 })

  const stored = await getMessages(id)
  const turn = placeTurn(stored, message)
  let incoming = turn.message

  if (!turn.retry) {
    // An active quiz blocks the chat until its results come in. One no saved message shows (its card
    // failed to save) can never be answered, so it is exited instead of blocking forever.
    const active = await getActiveQuizId(id)
    if (active && !stored.some(m => quizIdOf(m) === active))
      await exitActiveQuizzes(id)
    else if (active && quizResultsOf(incoming)?.quizId !== active)
      return new Response('Finish or exit the quiz first.', { status: 409 })

    // Ending a quiz: the results the tutor sees are rebuilt from the database, not taken from the client.
    const ending = quizResultsOf(incoming)
    if (ending) {
      const results = await endQuiz(userId, id, ending.quizId, ending.status)
      if (!results)
        return new Response('That quiz is not active.', { status: 409 })
      incoming = { ...incoming, parts: [{ type: QUIZ_RESULTS, data: results }] }
    }
  }

  // Side-thread exchanges since the last turn ride on this user message and are saved with it.
  // A retry keeps the side questions already folded into its saved copy.
  const fold = turn.retry ? null : foldThreads(await getThreadsWithMessages(id))
  // Plan doc changes the tutor hasn't seen ride on this message too, ahead of the side questions.
  const planFold = !turn.retry && convo.planId ? await foldPlanUpdates(convo.planId, convo.seen ?? {}) : null
  const added = [
    ...(planFold?.data ? [{ type: PLAN_UPDATED, data: planFold.data } as const] : []),
    ...(fold ? [{ type: SIDE_QUESTIONS, data: fold.data } as const] : []),
  ]
  const outgoing: UIMessage = added.length
    ? { ...incoming, parts: [...added, ...incoming.parts.filter(p => p.type !== SIDE_QUESTIONS && p.type !== PLAN_UPDATED)] }
    : incoming

  const messages = await validateUIMessages({ messages: [...turn.history, outgoing] })

  // Save the learner's message before calling the model, so a failed or dropped reply never loses it.
  if (turn.retry)
    await deleteMessagesFrom(id, turn.dropFrom)
  await saveMessages(id, messages)
  if (fold)
    await setFoldedThrough(fold.foldedThrough)
  if (planFold)
    await setSeen(id, planFold.seen)

  // The first message names the conversation, alongside the reply. A command says nothing about the topic.
  const question = textOf(incoming).trim()
  const title = !convo.title && turn.history.length === 0 && question && !parseCommand(incoming)
    ? titleConversation(id, question)
    : undefined
  if (title)
    after(title)

  const ctx = { userId, conversationId: id, title, system: await systemFor(convo) }
  if (parseCommand(outgoing)?.name === 'quiz-me')
    return quizReply(ctx, messages)
  return reply(ctx, messages)
}

interface Ctx { userId: string, conversationId: string, system: string, title?: Promise<string | null> }

/** Streams the tutor's reply and saves it. */
async function reply(ctx: Ctx, messages: UIMessage[]) {
  const modelMessages = await toModelMessages(messages)
  const result = streamText({
    model: await currentModel(),
    system: ctx.system,
    tools: toolsFor(ctx),
    toolChoice: TOOL_CHOICE,
    messages: markCacheBreakpoint(modelMessages, modelMessages.length - 1),
  })
  const replyId = saveReplyWhenDone(result.stream, r => saveMessages(ctx.conversationId, [...messages, r]))

  return respond(ctx, messages, replyId, (writer) => {
    writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false, messageMetadata: finishMetadata }))
  })
}

/**
 * /quiz-me: the model must call create_quiz, whose execute saves the quiz. Not streamed, so the answers in
 * the call never reach the browser; the saved and sent card keeps only the questions and choices.
 */
async function quizReply(ctx: Ctx, messages: UIMessage[]) {
  const cardId = generateId()
  return respond(ctx, messages, cardId, async (writer) => {
    // A retried /quiz-me replaces the card of a quiz that was never finished.
    await exitActiveQuizzes(ctx.conversationId)
    const modelMessages = await toModelMessages(messages)
    const result = await generateText({
      model: await currentModel(),
      system: ctx.system,
      tools: toolsFor(ctx),
      toolChoice: { type: 'tool', toolName: 'create_quiz' },
      messages: markCacheBreakpoint(modelMessages, modelMessages.length - 1),
      // Forcing a tool call doesn't work with thinking on.
      providerOptions: { anthropic: { thinking: { type: 'disabled' } } },
    })
    const call = result.toolCalls.find(c => c.toolName === 'create_quiz')
    const saved = result.toolResults.find(r => r.toolName === 'create_quiz')
    if (!call || !saved)
      throw new Error('The tutor couldn\'t write a quiz. Try again.')

    // The card keeps only questions and choices, in the shuffled order the quiz was saved in.
    const quiz = await getLearnerQuiz(ctx.userId, (saved.output as { quizId: string }).quizId)
    if (!quiz)
      throw new Error('The tutor couldn\'t write a quiz. Try again.')
    const input = { title: quiz.title, questions: quiz.questions.map(q => ({ question: q.question, choices: q.choices })) }
    const card: UIMessage = {
      id: cardId,
      role: 'assistant',
      parts: [{ type: 'step-start' }, { type: QUIZ_PART, toolCallId: call.toolCallId, state: 'output-available', input, output: saved.output }],
      metadata: { finishReason: 'tool-calls' },
    }
    await saveMessages(ctx.conversationId, [...messages, card])

    writer.write({ type: 'start-step' })
    writer.write({ type: 'tool-input-available', toolCallId: call.toolCallId, toolName: 'create_quiz', input })
    writer.write({ type: 'tool-output-available', toolCallId: call.toolCallId, output: saved.output })
    writer.write({ type: 'finish-step' })
    writer.write({ type: 'finish', finishReason: 'tool-calls', messageMetadata: card.metadata })
  })
}

function respond(ctx: Ctx, messages: UIMessage[], replyId: string, body: (writer: UIMessageStreamWriter) => void | Promise<void>) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      writer.write({ type: 'start', messageId: replyId })
      // The server adds to the learner's message (folded side questions and plan changes, quiz results
      // rebuilt from the database); send those parts back so the client's copy shows them too.
      for (const part of messages.at(-1)!.parts) {
        if (part.type === SIDE_QUESTIONS || part.type === QUIZ_RESULTS || part.type === PLAN_UPDATED)
          writer.write({ type: part.type, data: part.data, transient: true })
      }
      await body(writer)
      const title = await ctx.title
      if (title)
        writer.write({ type: TITLE_PART, data: title, transient: true })
    },
    onError: error => error instanceof Error ? error.message : 'Something went wrong.',
  })
  return createUIMessageStreamResponse({ stream })
}
