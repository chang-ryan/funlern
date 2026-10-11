import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth']
// Dev UI preview: `/` and its unpersisted chat route skip auth (and Supabase) entirely.
const OPEN_PATHS = ['/', '/api/scratch']

export async function proxy(request: NextRequest) {
  if (OPEN_PATHS.includes(request.nextUrl.pathname))
    return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet, headers) {
          for (const { name, value } of toSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options)
          for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v)
        },
      },
    },
  )

  // Refreshes the session cookie. Optimistic check only; routes re-verify.
  const { data } = await supabase.auth.getClaims()
  const isPublic = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
