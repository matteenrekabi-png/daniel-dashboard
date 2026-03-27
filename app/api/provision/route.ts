import { NextResponse } from 'next/server'

// Provisioning is handled via the admin panel at /admin
// This route is no longer used
export async function POST() {
  return NextResponse.json({ error: 'Not available' }, { status: 410 })
}
