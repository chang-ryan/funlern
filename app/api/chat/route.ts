import type { UIMessage, UIMessageStreamWriter } from 'ai'
import type { PlanSnapshot } from '@/lib/db/schema'
import type { SessionMode, SessionStart } from '@/lib/plans/modes'
import type { PlanUpdate } from '@/lib/plans/updates'
import { createUIMessageStream, createUIMessageStreamResponse, generateId, generateText, stepCountIs, streamText, toUIMessageStream, validateUIMessages } from 'ai'
import { after } from 'next/server'
import { isAddedPart } from '@/lib/added-parts'
import { markCacheBreakpoint } from '@/lib/ai/cache'
import { parseCommand } from '@/lib/ai/commands'
import { hideTools } from '@/lib/ai/hide-tools'
import { AI_OUTPUT_TOKENS } from '@/lib/ai/limits'
import { toModelMessages } from '@/lib/ai/messages'
import { currentModel, NO_THINKING } from '@/lib/ai/model'
import { finishMetadata, saveReplyWhenDone } from '@/lib/ai/reply'
import { systemFor } from '@/lib/ai/system'
import { titleConversation } from '@/lib/ai/title'
import { toolChoiceFor, toolsFor } from '@/lib/ai/tools'
import { placeTurn } from '@/lib/ai/turn'
import { errorResponse, NOT_FOUND, UNAUTHORIZED } from '@/lib/auth'
import { aiLimitResponse, reserveAiRequest } from '@/lib/db/ai-usage'
import { foldMaterialUpdates } from '@/lib/db/materials'
import { foldPlanUpdates, setSeen } from '@/lib/db/plans'
import { deleteMessagesFrom, getMessages, getOrStartConversation, getThreadsWithMessages, saveMessages, setFoldedThrough } from '@/lib/db/queries'
import { endQuiz, exitActiveQuizzes, getActiveQuizId, getLearnerQuiz } from '@/lib/db/quizzes'
import { stampSent, textOf, TITLE_PART } from '@/lib/messages'
import { PLAN_UPDATED } from '@/lib/plans/updates'
import { QUIZ_PART, QUIZ_RESULTS, quizIdOf, quizResultsOf } from '@/lib/quiz'
import { getUserId } from '@/lib/supabase/server'
import { foldThreads } from '@/lib/threads/fold'
import { SIDE_QUESTIONS } from '@/lib/threads/side-questions'

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return UNAUTHORIZED()

  const { id, message, start }: { id: string, message: UIMessage, start?: SessionStart } = await req.json()
  const convo = await getOrStartConversation(userId, id, start)
  if (!convo)
    return NOT_FOUND()
  if (message.role !== 'user')
    return errorResponse(400, 'Only learner messages.')

  const stored = await getMessages(id)
  const turn = placeTurn(stored, message)
  // A retry is the saved copy, which keeps its date; a new message is stamped now.
  let incoming = turn.retry ? turn.message : stampSent(turn.message)

  if (!turn.retry) {
    // An active quiz blocks the chat until its results come in. One no saved message shows (its card
    // failed to save) can never be answered, so it is exited instead of blocking forever.
    const active = await getActiveQuizId(id)
    if (active && !stored.some(m => quizIdOf(m) === active))
      await exitActiveQuizzes(id)
    else if (active && quizResultsOf(incoming)?.quizId !== active)
      return errorResponse(409, 'Finish or exit the quiz first.')

    // Ending a quiz: the results the tutor sees are rebuilt from the database, not taken from the client.
    const ending = quizResultsOf(incoming)
    if (ending) {
      const results = await endQuiz(userId, id, ending.quizId, ending.status)
      if (!results)
        return errorResponse(409, 'That quiz is not active.')
      incoming = { ...incoming, parts: [{ type: QUIZ_RESULTS, data: results }] }
    }
  }

  // Side-thread exchanges since the last turn ride on this user message and are saved with it.
  // A retry keeps the side questions already folded into its saved copy.
  const fold = turn.retry ? null : foldThreads(await getThreadsWithMessages(id))
  // Plan doc changes the tutor hasn't seen ride on this message too, ahead of the side questions.
  const planFold = !turn.retry && convo.planId ? await foldPlan(convo.planId, convo.context?.seen ?? { docs: {}, materials: [] }) : null
  const added = [
    ...(planFold?.data ? [{ type: PLAN_UPDATED, data: planFold.data } as const] : []),
    ...(fold ? [{ type: SIDE_QUESTIONS, data: fold.data } as const] : []),
  ]
  // Only the server adds these parts. A new message keeps none the browser sent, except quiz results, which were
  // rebuilt from the database above; a retry is the server's own saved copy.
  const own = turn.retry ? incoming.parts : incoming.parts.filter(p => !isAddedPart(p.type) || p.type === QUIZ_RESULTS)
  const outgoing: UIMessage = { ...incoming, parts: [...added, ...own] }

  const messages = await validateUIMessages({ messages: [...turn.history, outgoing] })

  const limit = await reserveAiRequest(userId)
  if (limit)
    return aiLimitResponse(limit)

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

  const ctx = { userId, conversationId: id, planId: convo.planId, mode: convo.mode, title, system: await systemFor(convo) }
  if (parseCommand(outgoing)?.name === 'quiz-me')
    return quizReply(ctx, messages)
  return reply(ctx, messages)
}

/** Doc and material changes the tutor hasn't seen, as one update for the next learner message. */
async function foldPlan(planId: string, seen: PlanSnapshot) {
  const [docs, materials] = await Promise.all([foldPlanUpdates(planId, seen.docs), foldMaterialUpdates(planId, seen.materials)])
  const changed = materials.added.length || materials.removed.length
  const data: PlanUpdate | null = docs.data || changed
    ? { docs: docs.data?.docs ?? [], ...(changed ? { materials: { added: materials.added, removed: materials.removed } } : {}) }
    : null
  return { data, seen: { docs: docs.seen, materials: materials.seen } }
}

interface Ctx { userId: string, conversationId: string, planId: string | null, mode: SessionMode, system: string, title?: Promise<string | null> }

/** Streams the tutor's reply and saves it. */
async function reply(ctx: Ctx, messages: UIMessage[]) {
  const modelMessages = await toModelMessages(messages)
  const result = streamText({
    model: await currentModel(),
    maxOutputTokens: AI_OUTPUT_TOKENS,
    system: ctx.system,
    tools: toolsFor(ctx),
    toolChoice: toolChoiceFor(ctx),
    // A tool call (update_doc) is a step; the tutor goes on writing after it.
    stopWhen: stepCountIs(4),
    messages: markCacheBreakpoint(modelMessages, modelMessages.length - 1),
  })
  const replyId = saveReplyWhenDone(result.stream, r => saveMessages(ctx.conversationId, [...messages, r]))

  return respond(ctx, messages, replyId, (writer) => {
    writer.merge(hideTools(toUIMessageStream({ stream: result.stream, sendStart: false, messageMetadata: finishMetadata })))
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
      maxOutputTokens: AI_OUTPUT_TOKENS,
      system: ctx.system,
      tools: toolsFor({ ...ctx, quiz: true }),
      toolChoice: { type: 'tool', toolName: 'create_quiz' },
      messages: markCacheBreakpoint(modelMessages, modelMessages.length - 1),
      providerOptions: NO_THINKING,
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
        if (isAddedPart(part.type) && 'data' in part)
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
