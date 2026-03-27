import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await getClientByUserId(user.id)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { id } = await params
  const admin = createAdminClient()

  // Verify the appointment belongs to this client before deleting
  const { data: appt } = await admin
    .from('appointments')
    .select('id')
    .eq('id', id)
    .eq('client_id', client.id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin.from('appointments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
