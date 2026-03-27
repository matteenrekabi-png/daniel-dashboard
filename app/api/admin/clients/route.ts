import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/log-activity'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

function isAdmin(req: Request) {
  return req.headers.get('x-admin-email') === ADMIN_EMAIL
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, user_id, business_name, email, vapi_assistant_id, created_at, is_active, admin_notes, announcement')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { businessName, email, password, vapiAssistantId } = await request.json()

  if (!businessName || !email || !password) {
    return NextResponse.json({ error: 'Business name, email, and password are required' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: authData.user.id,
      business_name: businessName,
      email,
      vapi_assistant_id: vapiAssistantId || null,
      is_active: true,
    })
    .select()
    .single()

  if (clientError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }

  await logActivity({ action: 'Client created', clientId: client.id, clientName: businessName, details: email })

  return NextResponse.json({ success: true, clientId: client.id })
}
