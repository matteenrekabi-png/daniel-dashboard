import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/log-activity'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (request.headers.get('x-admin-email') !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { newPassword } = await request.json()

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get the user_id for this client
  const { data: client } = await supabase
    .from('clients')
    .select('user_id, business_name')
    .eq('id', id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { error } = await supabase.auth.admin.updateUserById(client.user_id, {
    password: newPassword,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    action: 'Password reset',
    clientId: id,
    clientName: client.business_name,
  })

  return NextResponse.json({ success: true })
}
