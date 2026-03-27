import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/log-activity'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

function isAdmin(req: Request) {
  return req.headers.get('x-admin-email') === ADMIN_EMAIL
}

// GET - list additional users for a client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('client_users')
    .select('id, email, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST - add an additional user to a client
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { email, password } = await request.json()

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Email and password (min 8 chars) are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get client name for logging
  const { data: client } = await supabase
    .from('clients')
    .select('business_name')
    .eq('id', id)
    .single()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Link to client
  const { error: linkError } = await supabase.from('client_users').insert({
    client_id: id,
    user_id: authData.user.id,
    email,
  })

  if (linkError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  await logActivity({
    action: 'Additional user added',
    clientId: id,
    clientName: client?.business_name ?? null,
    details: email,
  })

  return NextResponse.json({ success: true })
}

// DELETE - remove an additional user (by client_users row id)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { rowId } = await request.json()

  if (!rowId) return NextResponse.json({ error: 'rowId required' }, { status: 400 })

  const supabase = createAdminClient()

  // Get the row so we can delete the auth user too
  const { data: row } = await supabase
    .from('client_users')
    .select('user_id, email, client_id')
    .eq('id', rowId)
    .eq('client_id', id)
    .single()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('client_users').delete().eq('id', rowId)
  await supabase.auth.admin.deleteUser(row.user_id)

  await logActivity({
    action: 'Additional user removed',
    clientId: id,
    details: row.email,
  })

  return NextResponse.json({ success: true })
}
