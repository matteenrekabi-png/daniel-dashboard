import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'

// GET — fetch this client's own messages
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await getClientByUserId(user.id)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('support_messages')
    .select('id, message, status, admin_note, created_at, updated_at, client_viewed')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

// POST — mark all as viewed by client
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await getClientByUserId(user.id)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const admin = createAdminClient()
  await admin
    .from('support_messages')
    .update({ client_viewed: true })
    .eq('client_id', client.id)
    .eq('client_viewed', false)

  return NextResponse.json({ success: true })
}
