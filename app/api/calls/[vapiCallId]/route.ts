import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vapiCallId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await getClientByUserId(user.id)
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { vapiCallId } = await params
  const admin = createAdminClient()

  const { error } = await admin.from('hidden_calls').upsert({
    client_id: client.id,
    vapi_call_id: vapiCallId,
  }, { onConflict: 'client_id,vapi_call_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
