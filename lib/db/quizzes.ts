import type { InferToolInput } from 'ai'
import type { createQuiz } from '@/lib/ai/tools/schemas'
import type { QuizEnd, QuizResults } from '@/lib/quiz'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '.'
import { quizAnswers, quizQuestions, quizzes } from './schema'
import 'server-only'

type QuizInput = InferToolInput<typeof createQuiz>

/** The choices in random order, with the answer index following its choice. Models put the right answer first. */
export function shuffleChoices<Q extends { choices: string[], answer: number }>(q: Q, random = Math.random): Q {
  const order = q.choices.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]]
  }
  return { ...q, choices: order.map(i => q.choices[i]), answer: order.indexOf(q.answer) }
}

/** Saves a quiz the tutor wrote. Ids come from the request, never from the model. */
export async function saveQuiz(ctx: { userId: string, conversationId: string }, input: QuizInput) {
  return db.transaction(async (tx) => {
    const [quiz] = await tx.insert(quizzes).values({ ...ctx, title: input.title }).returning({ id: quizzes.id })
    await tx.insert(quizQuestions).values(input.questions.map((q, position) => ({ quizId: quiz.id, position, ...shuffleChoices(q) })))
    return quiz.id
  })
}

async function ownedQuiz(userId: string, quizId: string) {
  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId))).limit(1)
  return quiz ?? null
}

async function questionsWithAnswers(quizId: string) {
  return db
    .select({ q: quizQuestions, a: quizAnswers })
    .from(quizQuestions)
    .leftJoin(quizAnswers, eq(quizAnswers.questionId, quizQuestions.id))
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.position))
}

/**
 * The quiz as the learner may see it: a question's answer and explanation only once it is answered, or
 * once the quiz has ended.
 */
export async function getLearnerQuiz(userId: string, quizId: string) {
  const quiz = await ownedQuiz(userId, quizId)
  if (!quiz)
    return null
  const rows = await questionsWithAnswers(quizId)
  return {
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    questions: rows.map(({ q, a }) => {
      const revealed = a || quiz.status !== 'active'
      return {
        id: q.id,
        question: q.question,
        choices: q.choices,
        picked: a?.choice ?? null,
        ...(revealed && { answer: q.answer, explanation: q.explanation }),
      }
    }),
  }
}

export type LearnerQuiz = NonNullable<Awaited<ReturnType<typeof getLearnerQuiz>>>

/** Grades and saves one pick. A question is answered once; asking again returns the saved result. */
export async function answerQuestion(userId: string, questionId: string, choice: number) {
  const [row] = await db
    .select({ q: quizQuestions, status: quizzes.status })
    .from(quizQuestions)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .where(and(eq(quizQuestions.id, questionId), eq(quizzes.userId, userId)))
    .limit(1)
  if (!row || row.status !== 'active' || !Number.isInteger(choice) || choice < 0 || choice >= row.q.choices.length)
    return null
  await db.insert(quizAnswers).values({ questionId, choice, correct: choice === row.q.answer }).onConflictDoNothing()
  const [saved] = await db.select().from(quizAnswers).where(eq(quizAnswers.questionId, questionId))
  return { picked: saved.choice, answer: row.q.answer, explanation: row.q.explanation }
}

/**
 * Ends the active quiz in this conversation and returns its results for the tutor. 'completed' needs
 * every question answered; 'exited' leaves the rest skipped. Null when there is no such active quiz.
 */
export async function endQuiz(userId: string, conversationId: string, quizId: string, status: QuizEnd): Promise<QuizResults | null> {
  const quiz = await ownedQuiz(userId, quizId)
  if (!quiz || quiz.conversationId !== conversationId || quiz.status !== 'active')
    return null
  const rows = await questionsWithAnswers(quizId)
  if (status === 'completed' && rows.some(r => !r.a))
    return null
  const ended = await db.update(quizzes).set({ status, endedAt: new Date() }).where(and(eq(quizzes.id, quizId), eq(quizzes.status, 'active'))).returning({ id: quizzes.id })
  if (!ended.length)
    return null
  return {
    quizId,
    title: quiz.title,
    status,
    items: rows.map(({ q, a }) => ({ question: q.question, choices: q.choices, picked: a?.choice ?? null, answer: q.answer })),
  }
}

export async function getActiveQuizId(conversationId: string) {
  const [quiz] = await db.select({ id: quizzes.id }).from(quizzes).where(and(eq(quizzes.conversationId, conversationId), eq(quizzes.status, 'active'))).limit(1)
  return quiz?.id ?? null
}

/** Exits quizzes left active when the turn that showed them is replaced (a retried /quiz-me). */
export async function exitActiveQuizzes(conversationId: string) {
  await db.update(quizzes).set({ status: 'exited', endedAt: new Date() }).where(and(eq(quizzes.conversationId, conversationId), eq(quizzes.status, 'active')))
}
