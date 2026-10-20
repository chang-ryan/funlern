'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await createClient().auth.signInWithOtp({ email })
    if (error)
      setError(error.message)
    else setSent(true)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: 'email' })
    if (error)
      setError(error.message)
    else router.replace('/')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {!sent
        ? (
            <form onSubmit={sendCode} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded border px-3 py-2"
              />
              <button className="rounded bg-foreground px-3 py-2 text-background">Email me a code</button>
            </form>
          )
        : (
            <form onSubmit={verifyCode} className="flex flex-col gap-3">
              <p className="text-sm opacity-70">
                Enter the code sent to
                {email}
                , or click the link in the email.
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="123456"
                className="rounded border px-3 py-2 tracking-widest"
              />
              <button className="rounded bg-foreground px-3 py-2 text-background">Verify</button>
            </form>
          )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  )
}
