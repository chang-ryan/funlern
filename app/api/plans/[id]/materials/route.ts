import type { MaterialKind } from '@/lib/plans/material'
import { revalidatePath } from 'next/cache'
import { errorResponse, NOT_FOUND, UNAUTHORIZED } from '@/lib/auth'
import { getActiveMaterials, insertMaterial } from '@/lib/db/materials'
import { getPlan } from '@/lib/db/plans'
import { ExtractError, extractPdf } from '@/lib/material/extract'
import { estimateTokens, MATERIAL_LIMITS, materialRefusal } from '@/lib/plans/material'
import { createAdminClient, MATERIALS_BUCKET } from '@/lib/supabase/admin'
import { getUserId } from '@/lib/supabase/server'

const refuse = (error: string, status = 422) => errorResponse(status, error)

/**
 * Adds one file to a plan's material: an uploaded PDF or Markdown file (form field `file`), or pasted text
 * (`name` and `text`). Its text is extracted here, once, and the original kept in the private bucket.
 */
export async function POST(req: Request, { params }: RouteContext<'/api/plans/[id]/materials'>) {
  const userId = await getUserId()
  if (!userId)
    return UNAUTHORIZED()
  const { id: planId } = await params
  const plan = await getPlan(userId, planId)
  if (!plan)
    return NOT_FOUND()

  const form = await req.formData()
  const file = form.get('file')
  const current = await getActiveMaterials(plan.id)
  const id = crypto.randomUUID()

  if (!(file instanceof File)) {
    const text = String(form.get('text') ?? '').trim()
    const name = String(form.get('name') ?? '').trim().slice(0, 120) || 'Pasted text'
    if (!text)
      return refuse('Paste some text first.', 400)
    const tokens = estimateTokens(text)
    const refusal = materialRefusal(current, { tokens })
    if (refusal)
      return refuse(refusal)
    await insertMaterial({ id, planId: plan.id, kind: 'paste', name, storagePath: null, text, pages: null, tokens })
    revalidatePath(`/p/${plan.id}`, 'layout')
    return Response.json({ id })
  }

  if (file.size > MATERIAL_LIMITS.bytes)
    return refuse(`That file is over ${MATERIAL_LIMITS.bytes / 1024 / 1024}MB.`)
  const kind: MaterialKind | null = /\.pdf$/i.test(file.name) ? 'pdf' : /\.(?:md|markdown|txt)$/i.test(file.name) ? 'markdown' : null
  if (!kind)
    return refuse('Upload a PDF or a Markdown (.md) file.', 400)
  const bytes = new Uint8Array(await file.arrayBuffer())

  let text: string
  let pages: number | null = null
  if (kind === 'pdf') {
    // Refuse a sixth file before paying for extraction; the token budget is checked once the text is known.
    const full = materialRefusal(current, { tokens: 0 })
    if (full)
      return refuse(full)
    try {
      ({ text, pages } = await extractPdf(bytes))
    }
    catch (error) {
      return refuse(error instanceof ExtractError ? error.message : 'That PDF couldn\'t be read.', error instanceof ExtractError ? 422 : 400)
    }
  }
  else {
    text = new TextDecoder().decode(bytes).trim()
  }
  if (!text)
    return refuse('No text could be read from that file.')
  const tokens = estimateTokens(text)
  const refusal = materialRefusal(current, { tokens })
  if (refusal)
    return refuse(refusal)

  const storage = createAdminClient().storage.from(MATERIALS_BUCKET)
  const storagePath = `${userId}/${plan.id}/${id}.${kind === 'pdf' ? 'pdf' : 'md'}`
  const { error } = await storage.upload(storagePath, bytes, { contentType: kind === 'pdf' ? 'application/pdf' : 'text/markdown' })
  if (error)
    return refuse(`Couldn't store the file: ${error.message}`, 500)
  try {
    await insertMaterial({ id, planId: plan.id, kind, name: file.name.slice(0, 120), storagePath, text, pages, tokens })
  }
  catch (e) {
    await storage.remove([storagePath])
    throw e
  }
  revalidatePath(`/p/${plan.id}`, 'layout')
  return Response.json({ id })
}
