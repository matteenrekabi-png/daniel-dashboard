import { NextResponse, type NextRequest } from 'next/server'

// Path-based routing only. Session validation is handled by each
// individual page/API route using createClient() server-side.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let through: API routes, auth callback, Next.js internals, static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Public auth pages — always accessible
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.next()
  }

  // Known protected routes — let through (pages enforce auth themselves)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Root → login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Everything else → login
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
