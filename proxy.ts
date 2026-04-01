import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession (reads cookie directly, no network call) for middleware routing.
  // getUser() (network-validated) is used inside page/API route code instead.
  const { data: { session } } = await supabase.auth.getSession()
  const userEmail = session?.user?.email ?? null

  const { pathname } = request.nextUrl

  // API routes and auth callback — always let through, they handle their own auth
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  // Static assets and Next.js internals — always let through
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return supabaseResponse
  }

  // /login and /signup — always allow, never redirect away
  if (pathname === '/login' || pathname === '/signup') {
    return supabaseResponse
  }

  // /dashboard — must be logged in, must not be admin
  if (pathname.startsWith('/dashboard')) {
    if (!session) return NextResponse.redirect(new URL('/login', request.url))
    if (userEmail === ADMIN_EMAIL) return NextResponse.redirect(new URL('/admin', request.url))
    return supabaseResponse
  }

  // /admin — must be logged in AND be admin
  if (pathname.startsWith('/admin')) {
    if (!session) return NextResponse.redirect(new URL('/login', request.url))
    if (userEmail !== ADMIN_EMAIL) return NextResponse.redirect(new URL('/dashboard', request.url))
    return supabaseResponse
  }

  // Root — redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Everything else — redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
