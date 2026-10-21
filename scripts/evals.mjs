// Live evals against the local stack with real Claude: `pnpm db:start`, `pnpm dev`, then `pnpm test:evals`.
// Only what a real model can show: does the tutor use the context the smoke test proves it gets, and do its tools
// get called from plain language? Each check calls Claude, so it costs a little and can flake on wording; the
// structure behind it is covered by smoke.mjs.
import assert from 'node:assert/strict'
import { asLearner, count, makePlan, pdfWithPages, say, sql, step, textOf, until } from './lib/stack.mjs'

const APP = process.env.APP_URL ?? 'http://localhost:3000'
const failures = []
async function check(name, run) {
  try {
    step(name, await run())
  }
  catch (error) {
    failures.push(name)
    console.log(`FAIL ${name} - ${error.message}`)
  }
}

await asLearner(APP, 'evals', async ({ userId, post, addMaterial }) => {
  const plan = await makePlan(userId, { brief: '## Goal\n\nPronounce Welsh place names, starting with Llanfair.', syllabus: '## Units\n\n- [ ] Vowels\n- [ ] Mutations\n\n## Notes\n' })
  const ps = { id: crypto.randomUUID() }

  await check('uses the brief', async () => {
    const answer = textOf(await post('/api/chat', { id: ps.id, start: { planId: plan.id }, message: say('In five words or fewer, what is my goal in this plan?') }))
    assert.match(answer, /welsh/i)
    return `"${answer.trim()}"`
  })

  await check('uses a folded edit', async () => {
    await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${ps.id}`) === 2)
    await sql`insert into plan_doc_versions (doc_id, version, body, author) values (${plan.docs.brief}, 2, '## Goal\n\nOrder coffee in Welsh.', 'user')`
    const answer = textOf(await post('/api/chat', { id: ps.id, message: say('And now, in five words or fewer, what is my goal?') }))
    assert.match(answer, /coffee/i)
    return `"${answer.trim()}"`
  })

  await check('ticks a unit when asked', async () => {
    const ws = { id: crypto.randomUUID() }
    await post('/api/chat', { id: ws.id, start: { planId: plan.id }, message: say('I have finished the Vowels unit. Please tick it off in my syllabus, then say "done".') })
    await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${ws.id}`) === 2)
    const [latest] = await sql`select body from plan_doc_versions where doc_id = ${plan.docs.syllabus} order by version desc limit 1`
    assert.match(latest.body, /- \[x\] Vowels/)
    assert.match(latest.body, /- \[ \] Mutations/)
    return 'update_doc ticked Vowels and kept Mutations'
  })

  await check('mission control writes training.md', async () => {
    await post('/api/chat', { id: crypto.randomUUID(), start: { planId: plan.id, mode: 'mission' }, message: say('I am training for a Welsh speaking exam in December: a 5 minute conversation with an examiner. Write training.md now without asking me anything: Method is one 5 minute spoken exchange in writing, no help; Rubric is pronunciation, mutations, fluency, each pass or fail.') })
    await until(async () => (await sql`select count(*)::int from plan_docs where plan_id = ${plan.id} and kind = 'training'`)[0].count === 1)
    const [training] = await sql`select v.body from plan_doc_versions v join plan_docs d on d.id = v.doc_id where d.plan_id = ${plan.id} and d.kind = 'training' order by v.version desc limit 1`
    assert.match(training.body, /## Method\n\n\S/)
    assert.match(training.body, /## Rubric\n\n\S/)
    return 'Method and Rubric written'
  })

  await check('uses pinned material', async () => {
    assert.equal((await addMaterial(plan.id, { name: 'Examiner notes', text: 'The examiner always opens by asking about the weather in Aberystwyth.' })).status, 200)
    const answer = textOf(await post('/api/chat', { id: crypto.randomUUID(), start: { planId: plan.id }, message: say('According to my material, what does the examiner open with? Answer in under ten words.') }))
    assert.match(answer, /weather/i)
    return `"${answer.trim()}"`
  })

  await check('transcribes an image-only page', async () => {
    const form = new File([pdfWithPages(['The examiner opens the speaking test with the weather.', ''])], 'scan.pdf', { type: 'application/pdf' })
    const res = await addMaterial(plan.id, { file: form })
    assert.equal(res.status, 200)
    const [m] = await sql`select text from plan_materials where id = ${(await res.json()).id}`
    assert.match(m.text, /weather/i)
    return 'transcription kept the page text'
  })

  await check('knows today\'s date', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const answer = textOf(await post('/api/chat', { id: crypto.randomUUID(), message: say('What is today\'s date? Reply with YYYY-MM-DD only.') }))
    assert.equal(answer.trim(), today)
    return today
  })

  await check('searches when asked about something recent', async () => {
    const answer = textOf(await post('/api/chat', { id: crypto.randomUUID(), start: { planId: plan.id }, message: say('Search the web: what is the latest stable release of Node.js? Answer in one line with the version and the source link.') }))
    const [{ n }] = await sql`select count(*)::int as n from web_searches where user_id = ${userId}`
    assert.ok(n >= 1, 'no search was run (is TAVILY_API_KEY set?)')
    assert.match(answer, /https?:\/\//, 'the answer cites a link')
    return `${n} search(es); "${answer.trim().slice(0, 80)}"`
  })

  await check('writes a quiz on the topic', async () => {
    const qz = { id: crypto.randomUUID() }
    await post('/api/chat', { id: qz.id, message: say('In two sentences, what is a JavaScript closure?') })
    await post('/api/chat', { id: qz.id, message: say('/quiz-me') })
    const [card] = await sql`select parts from messages where conversation_id = ${qz.id} and role = 'assistant' order by index desc limit 1`
    const questions = card.parts.find(p => p.type === 'tool-create_quiz').input.questions
    assert.ok(questions.length >= 1 && questions.length <= 5)
    assert.ok(questions.some(q => /closure|scope|function/i.test(q.question)))
    return `${questions.length} questions about closures`
  })
})

if (failures.length) {
  console.log(`\n${failures.length} eval(s) failed: ${failures.join(', ')}`)
  process.exitCode = 1
}
