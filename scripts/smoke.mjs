// End-to-end smoke test against the local stack: `pnpm db:start`, `pnpm dev`, then `pnpm test:smoke`.
// Signs in through Mailpit, chats, opens a thread, and checks the thread folds into the next main turn.
// Calls Claude a few times, so it is opt-in rather than part of `pnpm test`.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import postgres from 'postgres'

config({ path: '.env.local' })
const API = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const APP = process.env.APP_URL ?? 'http://localhost:3000'
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:55324'
const email = `smoke-${Date.now()}@example.com`
const sql = postgres(process.env.DATABASE_URL)

/** A minimal PDF with one Helvetica text line per page; an empty line makes a page with no text layer. */
function pdfWithPages(lines) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  const kids = lines.map((line) => {
    const stream = line ? `BT /F1 12 Tf 72 720 Td (${line}) Tj ET` : ''
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length} 0 R >>`)
    return `${objects.length} 0 R`
  })
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${lines.length} >>`
  let out = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const at = out.length
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
    return at
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(out)
}

const step = (name, detail = '') => console.log(`ok  ${name}${detail ? ` - ${detail}` : ''}`)
const textOf = raw => raw.split('\n').filter(l => l.includes('"text-delta"')).map(l => JSON.parse(l.slice(6)).delta).join('')

try {
  const h = { 'apikey': KEY, 'content-type': 'application/json' }
  await fetch(`${API}/auth/v1/otp`, { method: 'POST', headers: h, body: JSON.stringify({ email, create_user: true }) })
  await new Promise(r => setTimeout(r, 1000))
  const inbox = await (await fetch(`${MAILPIT}/api/v1/messages`)).json()
  const mail = await (await fetch(`${MAILPIT}/api/v1/message/${inbox.messages.find(m => m.To[0].Address === email).ID}`)).json()
  const code = mail.HTML.match(/<strong>(\d{6})<\/strong>/)[1]
  const session = await (await fetch(`${API}/auth/v1/verify`, { method: 'POST', headers: h, body: JSON.stringify({ type: 'email', email, token: code }) })).json()
  const ref = new URL(API).hostname.split('.')[0]
  const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
  const [profile] = await sql`select count(*)::int from profiles where id = ${session.user.id}`
  assert.equal(profile.count, 1, 'signup trigger created a profile')
  step('sign in', 'code from Mailpit, profile created')

  const post = async (path, body) => {
    const res = await fetch(`${APP}${path}`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal(res.status, 200, `${path} -> ${res.status}`)
    return res.text()
  }
  // Replies are saved in onEnd, just after the stream closes: wait for the row instead of guessing a delay.
  const until = async (check) => {
    for (let i = 0; i < 50; i++) {
      if (await check())
        return
      await new Promise(r => setTimeout(r, 100))
    }
    throw new Error('timed out waiting for a save')
  }
  const count = async q => (await q)[0].count
  const say = text => ({ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] })

  // A new chat has no row until its first message; the chat route creates it.
  const c = { id: crypto.randomUUID() }
  const first = await post('/api/chat', { id: c.id, message: say('In one sentence, what is a closure?') })
  assert.ok(textOf(first))
  assert.equal(await count(sql`select count(*)::int from conversations where id = ${c.id} and user_id = ${session.user.id}`), 1)
  await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${c.id}`) === 2)
  const [a] = await sql`select id, index from messages where conversation_id = ${c.id} and role = 'assistant'`
  const [{ title }] = await sql`select title from conversations where id = ${c.id}`
  assert.ok(title && first.includes('"type":"data-title"'), 'first turn names the conversation')
  step('main chat', `conversation created on first message; reply streamed and saved; titled "${title}"`)

  const [t] = await sql`insert into threads (conversation_id, anchor_message_id, anchor, snapshot_index)
    values (${c.id}, ${a.id}, ${sql.json({ quote: 'closure', prefix: '', suffix: '' })}, ${a.index}) returning id`
  assert.ok(textOf(await post('/api/thread', { id: t.id, message: say('why is it called that?') })))
  await until(async () => await count(sql`select count(*)::int from thread_messages where thread_id = ${t.id}`) === 2)
  assert.equal(await count(sql`select count(*)::int from thread_messages where thread_id = ${t.id} and id = ''`), 0, 'replies get real ids')
  step('thread', 'reply streamed and saved')

  const next = say('Thanks, go on.')
  const raw = await post('/api/chat', { id: c.id, message: next })
  assert.ok(raw.includes('"type":"data-side-questions"'), 'stream announces the fold')
  await until(async () => await count(sql`select count(*)::int from messages where id = ${next.id}`) === 1)
  const [saved] = await sql`select parts from messages where id = ${next.id}`
  assert.equal(saved.parts[0].type, 'data-side-questions')
  const [{ folded_through: folded }] = await sql`select folded_through from threads where id = ${t.id}`
  assert.equal(folded, 2)
  step('fold', 'side question saved on the next main turn, folded_through = 2')

  assert.ok(!(await post('/api/chat', { id: c.id, message: say('ok') })).includes('"type":"data-side-questions"'))
  step('no re-fold', 'already-folded exchanges are not sent again')

  // Drop the connection after the first chunk: the server must still finish the reply and save it whole.
  const [d] = await sql`insert into conversations (user_id) values (${session.user.id}) returning id`
  const ask = say('List ten animals, one per line, nothing else.')
  const controller = new AbortController()
  const res = await fetch(`${APP}/api/chat`, { method: 'POST', signal: controller.signal, headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: d.id, message: ask }) })
  await res.body.getReader().read()
  controller.abort()
  assert.equal(await count(sql`select count(*)::int from messages where id = ${ask.id}`), 1, 'question saved before the reply')
  await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${d.id} and role = 'assistant'`) === 1)
  const [dropped] = await sql`select parts, metadata from messages where conversation_id = ${d.id} and role = 'assistant'`
  assert.equal(dropped.metadata?.finishReason, 'stop', 'reply ran to completion')
  assert.ok(dropped.parts.some(p => p.type === 'text' && p.text.split('\n').filter(Boolean).length >= 5), 'whole reply saved')
  step('dropped connection', 'reply finished and saved after the client went away')

  // Resending the same question is a retry: one question, one fresh reply, no duplicates.
  assert.ok(textOf(await post('/api/chat', { id: d.id, message: ask })))
  await until(async () => (await sql`select metadata from messages where conversation_id = ${d.id} and role = 'assistant'`)[0]?.metadata?.finishReason === 'stop')
  const rows = await sql`select role from messages where conversation_id = ${d.id} order by index`
  assert.deepEqual(rows.map(r => r.role), ['user', 'assistant'])
  step('retry', 'resent question replaced its reply instead of duplicating')

  const [q] = await sql`select id, parts from thread_messages where thread_id = ${t.id} and role = 'user'`
  assert.ok(textOf(await post('/api/thread', { id: t.id, message: { id: q.id, role: 'user', parts: q.parts } })))
  await until(async () => (await sql`select metadata from thread_messages where thread_id = ${t.id} and role = 'assistant'`)[0]?.metadata?.finishReason === 'stop')
  assert.deepEqual((await sql`select role from thread_messages where thread_id = ${t.id} order by index`).map(r => r.role), ['user', 'assistant'])
  step('thread retry', 'resent thread question replaced its reply')

  const qz = { id: crypto.randomUUID() }
  await post('/api/chat', { id: qz.id, message: say('In two sentences, what is a closure?') })
  await post('/api/chat', { id: qz.id, message: say('/quiz-me') })
  const [card] = await sql`select parts, metadata from messages where conversation_id = ${qz.id} and role = 'assistant' order by index desc limit 1`
  const call = card.parts.find(p => p.type === 'tool-create_quiz')
  assert.equal(card.metadata.finishReason, 'tool-calls')
  assert.ok(call.input.questions.every(q => !('answer' in q) && !('explanation' in q)), 'the saved card has no answers')
  const { quizId } = call.output
  const questions = await sql`select id, answer from quiz_questions where quiz_id = ${quizId} order by position`
  assert.ok(questions.length >= 1 && questions.length <= 5)
  const blocked = await fetch(`${APP}/api/chat`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: qz.id, message: say('skip this') }) })
  assert.equal(blocked.status, 409, 'chat is blocked while the quiz is active')
  // Answers go through a server action in the app; here they are written directly.
  for (const q of questions)
    await sql`insert into quiz_answers (question_id, choice, correct) values (${q.id}, ${q.answer}, true)`
  const end = { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'data-quiz-results', data: { quizId, status: 'completed', items: [] } }] }
  assert.ok(textOf(await post('/api/chat', { id: qz.id, message: end })))
  await until(async () => (await sql`select metadata from messages where conversation_id = ${qz.id} order by index desc limit 1`)[0]?.metadata?.finishReason === 'stop')
  const [results] = await sql`select parts from messages where id = ${end.id}`
  assert.equal(results.parts.find(p => p.type === 'data-quiz-results').data.items.length, questions.length, 'results rebuilt from the database')
  assert.equal((await sql`select status from quizzes where id = ${quizId}`)[0].status, 'completed')
  const again = await fetch(`${APP}/api/chat`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: qz.id, message: { ...end, id: crypto.randomUUID() } }) })
  assert.equal(again.status, 409, 'an ended quiz cannot be ended again')
  step('quiz', `tutor wrote ${questions.length} questions; card has no answers; chat blocked until results; results rebuilt server-side; review saved`)

  // A session in a plan pins the plan's docs and the tutor teaches from them.
  const [plan] = await sql`insert into plans (user_id, title) values (${session.user.id}, 'Smoke plan') returning id`
  const [doc] = await sql`insert into plan_docs (plan_id, kind) values (${plan.id}, 'brief') returning id`
  await sql`insert into plan_doc_versions (doc_id, version, body, author) values (${doc.id}, 1, '## Goal\n\nPronounce Welsh place names, starting with Llanfair.', 'user')`
  const ps = { id: crypto.randomUUID() }
  const answer = textOf(await post('/api/chat', { id: ps.id, start: { planId: plan.id }, message: say('In five words or fewer, what is my goal in this plan?') }))
  const [pinned] = await sql`select plan_id, pinned from conversations where id = ${ps.id}`
  assert.equal(pinned.plan_id, plan.id)
  assert.deepEqual(pinned.pinned, { brief: 1 })
  assert.match(answer, /welsh/i, 'tutor sees the plan brief')
  const other = await fetch(`${APP}/api/chat`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: crypto.randomUUID(), start: { planId: crypto.randomUUID() }, message: say('hi') }) })
  assert.equal(other.status, 404, 'a plan that is not yours is refused')
  step('plan session', `created in the plan, docs pinned, tutor answered "${answer.trim()}"`)

  // An edit made outside the session reaches its tutor on the next message, without touching the system prompt.
  await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${ps.id}`) === 2)
  await sql`insert into plan_doc_versions (doc_id, version, body, author) values (${doc.id}, 2, '## Goal\n\nOrder coffee in Welsh.', 'user')`
  const edited = await post('/api/chat', { id: ps.id, message: say('And now, in five words or fewer, what is my goal?') })
  assert.ok(edited.includes('"type":"data-plan-updated"'), 'stream announces the plan update')
  assert.match(textOf(edited), /coffee/i, 'tutor sees the edited brief')
  const [after] = await sql`select pinned, seen from conversations where id = ${ps.id}`
  assert.deepEqual([after.pinned, after.seen], [{ brief: 1 }, { brief: 2 }], 'pinned stays, seen advances')
  step('plan update', `edit folded into the next message; tutor answered "${textOf(edited).trim()}"`)

  // The tutor writes a doc section with update_doc, then keeps talking; the write doesn't come back as a fold.
  const [syl] = await sql`insert into plan_docs (plan_id, kind) values (${plan.id}, 'syllabus') returning id`
  await sql`insert into plan_doc_versions (doc_id, version, body, author) values (${syl.id}, 1, '## Units\n\n- [ ] Vowels\n- [ ] Mutations\n\n## Notes\n', 'tutor')`
  const ws = { id: crypto.randomUUID() }
  const wrote = await post('/api/chat', { id: ws.id, start: { planId: plan.id }, message: say('I have finished the Vowels unit. Please tick it off in my syllabus, then say "done".') })
  assert.ok(wrote.includes('"toolName":"update_doc"'), 'tutor called update_doc')
  assert.ok(textOf(wrote).trim(), 'tutor kept writing after the tool call')
  await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${ws.id}`) === 2)
  const [v2] = await sql`select body, author, conversation_id from plan_doc_versions where doc_id = ${syl.id} and version = 2`
  assert.equal(v2.author, 'tutor')
  assert.equal(v2.conversation_id, ws.id)
  assert.match(v2.body, /- \[x\] Vowels/)
  assert.match(v2.body, /- \[ \] Mutations/, 'the rest of the section stays')
  assert.equal((await sql`select seen from conversations where id = ${ws.id}`)[0].seen.syllabus, 2, 'its own write counts as seen')
  assert.ok(!(await post('/api/chat', { id: ws.id, message: say('thanks') })).includes('"type":"data-plan-updated"'), 'own write is not folded back')
  step('doc write', 'update_doc ticked Vowels as version 2; tutor went on; not folded back to itself')

  // Training: the plan's first training session sets up training.md; after that, sessions are reps with a style.
  const setup = { id: crypto.randomUUID() }
  await post('/api/chat', { id: setup.id, start: { planId: plan.id, mode: 'training', style: 'full' }, message: say('I am training for a Welsh speaking exam in December: a 5 minute conversation with an examiner. Write training.md now without asking me anything: Method is one 5 minute spoken exchange in writing, no help; Rubric is pronunciation, mutations, fluency, each pass or fail.') })
  const [setupRow] = await sql`select mode, training_style from conversations where id = ${setup.id}`
  assert.deepEqual([setupRow.mode, setupRow.training_style], ['training', null], 'no training.md yet: a setup session, no style')
  await until(async () => (await sql`select count(*)::int from plan_docs where plan_id = ${plan.id} and kind = 'training'`)[0].count === 1)
  const [training] = await sql`select v.body, v.author from plan_doc_versions v join plan_docs d on d.id = v.doc_id where d.plan_id = ${plan.id} and d.kind = 'training' order by v.version desc limit 1`
  assert.equal(training.author, 'tutor')
  assert.match(training.body, /## Method\n\n\S/, 'Method written')
  assert.match(training.body, /## Rubric\n\n\S/, 'Rubric written')
  const rep = { id: crypto.randomUUID() }
  assert.ok(textOf(await post('/api/chat', { id: rep.id, start: { planId: plan.id, mode: 'training', style: 'card' }, message: say('Start the rep.') })))
  const [repRow] = await sql`select mode, training_style, pinned from conversations where id = ${rep.id}`
  assert.deepEqual([repRow.mode, repRow.training_style], ['training', 'card'])
  assert.ok(repRow.pinned.training >= 1, 'the rep pins training.md')
  const loose = { id: crypto.randomUUID() }
  await post('/api/chat', { id: loose.id, start: { mode: 'training' }, message: say('hi') })
  assert.equal((await sql`select mode from conversations where id = ${loose.id}`)[0].mode, 'learning', 'training needs a plan')
  step('training', 'setup session wrote training.md (Method, Rubric); next session is a card-drill rep pinning it; no plan means learning')

  // Material: pasted text is pinned into new sessions; adding or deleting reaches a running one on its next message.
  const addMaterial = async (fields) => {
    const form = new FormData()
    for (const [k, v] of Object.entries(fields)) form.set(k, v)
    return fetch(`${APP}/api/plans/${plan.id}/materials`, { method: 'POST', headers: { cookie }, body: form })
  }
  const pasted = await addMaterial({ name: 'Examiner notes', text: 'The examiner always opens by asking about the weather in Aberystwyth.' })
  assert.equal(pasted.status, 200, `paste -> ${pasted.status}`)
  const { id: noteId } = await pasted.json()
  const ms = { id: crypto.randomUUID() }
  const opener = textOf(await post('/api/chat', { id: ms.id, start: { planId: plan.id }, message: say('According to my material, what does the examiner open with? Answer in under ten words.') }))
  assert.match(opener, /weather/i, 'tutor reads pinned material')
  assert.deepEqual((await sql`select pinned_materials from conversations where id = ${ms.id}`)[0].pinned_materials, [noteId])
  assert.equal((await addMaterial({ text: 'x'.repeat(120_000) })).status, 422, 'over the token budget is refused')

  await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${ms.id}`) === 2)
  assert.equal((await addMaterial({ name: 'Mutations cheat sheet', text: 'Soft mutation after "dy": cath becomes dy gath.' })).status, 200)
  const added = await post('/api/chat', { id: ms.id, message: say('Per my material, what does cath become after dy? Two words.') })
  assert.ok(added.includes('"type":"data-plan-updated"') && /gath/i.test(textOf(added)), 'an added file reaches the running session')

  await until(async () => await count(sql`select count(*)::int from messages where conversation_id = ${ms.id}`) === 4)
  await sql`update plan_materials set deleted_at = now() where id = ${noteId}`
  const removed = await post('/api/chat', { id: ms.id, message: say('ok') })
  assert.ok(removed.includes('"removed":[{'), 'a deleted file is announced as removed')
  assert.match((await sql`select text from plan_materials where id = ${noteId}`)[0].text, /weather/, 'deleted text stays for pinned sessions')
  step('material', 'pasted file pinned and read; over-budget refused; additions and deletions folded into the running session')

  // Uploads: the original goes to Storage once and its text is extracted once; deleting removes the original.
  const upload = async (name, type, bytes) => {
    const form = new FormData()
    form.set('file', new File([bytes], name, { type }))
    const res = await fetch(`${APP}/api/plans/${plan.id}/materials`, { method: 'POST', headers: { cookie }, body: form })
    assert.equal(res.status, 200, `${name} -> ${res.status} ${res.status === 200 ? '' : await res.text()}`)
    const { id } = await res.json()
    return (await sql`select kind, text, pages, storage_path from plan_materials where id = ${id}`)[0]
  }
  const stored = async path => (await sql`select count(*)::int from storage.objects where bucket_id = 'materials' and name = ${path}`)[0].count
  await sql`update plan_materials set deleted_at = now() where plan_id = ${plan.id}`
  const pdf = await upload('closures.pdf', 'application/pdf', pdfWithPages(['A closure is a function bundled with its lexical scope.', 'Closures capture variables, not values.']))
  assert.equal(pdf.pages, 2)
  assert.match(pdf.text, /\[page 2\]\n\nClosures capture variables/, 'text layer extracted')
  assert.equal(await stored(pdf.storage_path), 1, 'original stored')
  const md = await upload('notes.md', 'text/markdown', new TextEncoder().encode('# Notes\n\nThe planner prefers index scans for selective filters.'))
  assert.equal(md.kind, 'markdown')
  assert.equal(await stored(md.storage_path), 1)
  const scan = await upload('scan.pdf', 'application/pdf', pdfWithPages(['The examiner opens with the weather.', '']))
  assert.match(scan.text, /weather/i, 'a page with no text sends the PDF to Claude to transcribe')
  const tooLong = new FormData()
  tooLong.set('file', new File([pdfWithPages(Array.from({ length: 6 }, (_, i) => `Page ${i + 1} of a long handout.`))], 'long.pdf', { type: 'application/pdf' }))
  assert.equal((await fetch(`${APP}/api/plans/${plan.id}/materials`, { method: 'POST', headers: { cookie }, body: tooLong })).status, 422, 'a 6-page PDF is refused')
  step('upload', 'PDF text layer and Markdown stored once with originals in Storage; image-only page transcribed; 6 pages refused')
}
finally {
  // Uploaded originals live in Storage, which deleting the user doesn't reach.
  const [user] = await sql`select id from auth.users where email = ${email}`
  if (user && process.env.SUPABASE_SECRET_KEY) {
    const storage = createClient(API, process.env.SUPABASE_SECRET_KEY).storage.from('materials')
    const paths = (await sql`select name from storage.objects where bucket_id = 'materials' and name like ${`${user.id}/%`}`).map(r => r.name)
    if (paths.length)
      await storage.remove(paths)
  }
  await sql`delete from auth.users where email = ${email}`
  await sql.end()
}
