import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

// Public paths that don't require a session
const PUBLIC = ['/login', '/signup', '/auth/callback']

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

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rule 1: /login and other public paths — always allow, never auto-redirect away
  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return supabaseResponse
  }

  // Rule 2: /dashboard — must be logged in, must not be admin
  if (pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (user.email === ADMIN_EMAIL) return NextResponse.redirect(new URL('/admin', request.url))
    return supabaseResponse
  }

  // Rule 3: /admin — must be logged in AND be admin
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (user.email !== ADMIN_EMAIL) return NextResponse.redirect(new URL('/dashboard', request.url))
    return supabaseResponse
  }

  // Rule 4: everything else — redirect to /login
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // Match every path except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
