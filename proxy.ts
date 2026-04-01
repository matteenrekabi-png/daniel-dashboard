import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const isAdmin = user?.email === 'matteenrekabi@superior-ai.org'

  // Protect dashboard — unauthenticated users go to login; admin users go to /admin
  if (pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (isAdmin) return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Protect admin — unauthenticated users go to login
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const destination = isAdmin ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/admin', '/login', '/signup'],
}

