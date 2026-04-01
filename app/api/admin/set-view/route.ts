import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const base = `${proto}://${host}`

  if (!clientId) return NextResponse.redirect(new URL('/admin', base))

  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/login', base))
  }

  // Build the correct public base URL from forwarded headers (Railway proxy)
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const base = `${proto}://${host}`

  // Set cookie then redirect to the real dashboard
  const response = NextResponse.redirect(new URL('/dashboard', base))
  response.cookies.set('admin_view_client_id', clientId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return response
}
