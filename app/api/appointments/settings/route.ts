import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — called by n8n Workflow 2 to read a client's appointment settings
// Secured by a shared secret passed as a query param: ?secret=xxx&client_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const clientId = searchParams.get('client_id')

  if (secret !== process.env.APPOINTMENTS_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: settings, error } = await supabase
    .from('appointment_settings')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(settings)
}

// POST — called from the dashboard UI to save settings
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .single()

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    await supabase.from('appointment_settings').upsert({
      client_id: client.id,
      available_days: body.available_days,
      time_window_start: body.time_window_start,
      time_window_end: body.time_window_end,
      booking_buffer_minutes: body.booking_buffer_minutes,
      max_appointments_per_day: body.max_appointments_per_day,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    )
  }
}
