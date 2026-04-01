import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const base = `${proto}://${host}`

  const response = NextResponse.redirect(new URL('/admin', base))
  response.cookies.delete('admin_view_client_id')
  return response
}
