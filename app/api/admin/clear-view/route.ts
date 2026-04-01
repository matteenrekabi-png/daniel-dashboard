import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/admin', request.url))
  response.cookies.delete('admin_view_client_id')
  return response
}
