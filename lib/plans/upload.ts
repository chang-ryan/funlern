import { MATERIAL_LIMITS } from './material'

// Adds one file to a plan's material from the browser. Client-safe.

export type MaterialUpload = { file: File } | { name: string, text: string }

/** Uploads a file or pasted text to the plan. Resolves to null when added, or the reason it wasn't. */
export async function uploadMaterial(planId: string, upload: MaterialUpload): Promise<string | null> {
  if ('file' in upload && upload.file.size > MATERIAL_LIMITS.bytes)
    return `That file is over ${MATERIAL_LIMITS.bytes / 1024 / 1024}MB.`
  const body = new FormData()
  if ('file' in upload) {
    body.set('file', upload.file)
  }
  else {
    body.set('name', upload.name)
    body.set('text', upload.text)
  }
  const res = await fetch(`/api/plans/${planId}/materials`, { method: 'POST', body }).catch(() => null)
  if (res?.ok)
    return null
  return (await res?.json().catch(() => null) as { error?: string } | null)?.error ?? 'Couldn\'t add that file.'
}
