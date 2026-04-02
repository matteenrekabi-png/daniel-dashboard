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

export async function DELETE(request: Request) {
  const adminEmail = request.headers.get('x-admin-email')
  if (adminEmail !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json()
  const admin = createAdminClient()
  await admin.from('support_messages').delete().eq('id', id)
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const adminEmail = request.headers.get('x-admin-email')
  if (adminEmail !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, read, status, admin_note } = await request.json()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (read !== undefined) updates.read = read
  if (status !== undefined) updates.status = status
  if (admin_note !== undefined) updates.admin_note = admin_note

  // When admin updates status or note, mark as unviewed so client gets the badge
  if (status !== undefined || admin_note !== undefined) {
    updates.client_viewed = false
  }

  await admin.from('support_messages').update(updates).eq('id', id)
  return NextResponse.json({ success: true })
}
