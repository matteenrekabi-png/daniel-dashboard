import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export async function GET(request: Request) {
  if (request.headers.get('x-admin-email') !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, created_at, action, client_name, details')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
