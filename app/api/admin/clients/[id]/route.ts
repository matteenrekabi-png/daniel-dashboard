import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/log-activity'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

function isAdmin(req: Request) {
  return req.headers.get('x-admin-email') === ADMIN_EMAIL
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  // Only allow patching safe fields
  const allowed = ['business_name', 'email', 'vapi_assistant_id', 'is_active', 'admin_notes', 'announcement']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Fetch client name for activity log
  const { data: existing } = await supabase
    .from('clients')
    .select('business_name')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const changedKeys = Object.keys(updates).join(', ')
  await logActivity({
    action: `Client updated: ${changedKeys}`,
    clientId: id,
    clientName: existing?.business_name ?? null,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  // Get client info before deleting
  const { data: client } = await supabase
    .from('clients')
    .select('user_id, business_name, email')
    .eq('id', id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Delete the client row (cascades to calls, appointments via FK)
  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Delete auth user
  await supabase.auth.admin.deleteUser(client.user_id)

  await logActivity({
    action: 'Client deleted',
    clientName: client.business_name,
    details: client.email,
  })

  return NextResponse.json({ success: true })
}
