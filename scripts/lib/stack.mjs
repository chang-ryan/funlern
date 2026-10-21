// Shared setup for scripts that drive the local stack: sign in a throwaway learner through Mailpit, call the app's
// routes as them, read the database, and clean up after. Used by smoke.mjs and evals.mjs.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import postgres from 'postgres'

config({ path: '.env.local', quiet: true })
const API = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:55324'

export const sql = postgres(process.env.DATABASE_URL)
export const step = (name, detail = '') => console.log(`ok  ${name}${detail ? ` - ${detail}` : ''}`)
export const textOf = raw => raw.split('\n').filter(l => l.includes('"text-delta"')).map(l => JSON.parse(l.slice(6)).delta).join('')
export const say = text => ({ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] })
export const count = async q => (await q)[0].count

/** Waits for a check to pass: replies are saved just after their stream closes. */
export async function until(check) {
  for (let i = 0; i < 50; i++) {
    if (await check())
      return
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('timed out waiting for a save')
}

/** A minimal PDF with one Helvetica text line per page; an empty line makes a page with no text layer. */
export function pdfWithPages(lines) {
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

/**
 * Signs in a new learner (code from Mailpit) and runs `body` with helpers bound to them and `app`. Deletes the
 * learner afterwards, with their uploads, which deleting the user doesn't reach.
 */
export async function asLearner(app, label, body) {
  const email = `${label}-${Date.now()}@example.com`
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

    /** POSTs JSON; returns the Response. */
    const send = (path, json) => fetch(`${app}${path}`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(json) })
    /** POSTs JSON and expects 200; returns the raw stream text. */
    const post = async (path, json) => {
      const res = await send(path, json)
      assert.equal(res.status, 200, `${path} -> ${res.status} ${res.status === 200 ? '' : await res.text()}`)
      return res.text()
    }
    /** Adds material to a plan: { file } or { name, text }. Returns the Response. */
    const addMaterial = (planId, fields) => {
      const form = new FormData()
      for (const [k, v] of Object.entries(fields)) form.set(k, v)
      return fetch(`${app}/api/plans/${planId}/materials`, { method: 'POST', headers: { cookie }, body: form })
    }
    await body({ session, userId: session.user.id, cookie, send, post, addMaterial })
  }
  finally {
    const [user] = await sql`select id from auth.users where email = ${email}`
    if (user && process.env.SUPABASE_SECRET_KEY) {
      const paths = (await sql`select name from storage.objects where bucket_id = 'materials' and name like ${`${user.id}/%`}`).map(r => r.name)
      if (paths.length)
        await createClient(API, process.env.SUPABASE_SECRET_KEY).storage.from('materials').remove(paths)
    }
    await sql`delete from auth.users where email = ${email}`
    await sql.end()
  }
}

/** A plan for the learner with the given docs (kind → body), version 1 each. */
export async function makePlan(userId, docs) {
  const [plan] = await sql`insert into plans (user_id, title) values (${userId}, 'Test plan') returning id`
  const ids = {}
  for (const [kind, body] of Object.entries(docs)) {
    const [doc] = await sql`insert into plan_docs (plan_id, kind) values (${plan.id}, ${kind}) returning id`
    await sql`insert into plan_doc_versions (doc_id, version, body, author) values (${doc.id}, 1, ${body}, 'user')`
    ids[kind] = doc.id
  }
  return { id: plan.id, docs: ids }
}
