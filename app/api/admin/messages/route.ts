import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export async function GET(request: Request) {
  const adminEmail = request.headers.get('x-admin-email')
  if (adminEmail !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('support_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: Request) {
  const adminEmail = request.headers.get('x-admin-email')
  if (adminEmail !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, read } = await request.json()
  const admin = createAdminClient()
  await admin.from('support_messages').update({ read }).eq('id', id)
  return NextResponse.json({ success: true })
}
