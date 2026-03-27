import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export async function GET(request: Request) {
  const supabase = createAdminClient()

  // Verify caller is the admin
  const authHeader = request.headers.get('x-admin-email')
  if (authHeader !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, business_name, email, vapi_assistant_id, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  // Verify caller is the admin
  const authHeader = request.headers.get('x-admin-email')
  if (authHeader !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessName, email, password, vapiAssistantId } = await request.json()

  if (!businessName || !email || !password || !vapiAssistantId) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Create the Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Create the client row
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: authData.user.id,
      business_name: businessName,
      email,
      vapi_assistant_id: vapiAssistantId,
    })
    .select()
    .single()

  if (clientError) {
    // Roll back the auth user if client insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, clientId: client.id })
}
