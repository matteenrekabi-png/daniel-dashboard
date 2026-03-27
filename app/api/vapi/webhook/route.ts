import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// VAPI sends webhook events here for call.ended events
// n8n Workflow 1 handles these too — this is a direct fallback/backup route
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || message.type !== 'end-of-call-report') {
      return NextResponse.json({ received: true })
    }

    const { call } = message
    if (!call) return NextResponse.json({ received: true })

    const assistantId = call.assistantId
    if (!assistantId) return NextResponse.json({ received: true })

    const supabase = createAdminClient()

    // Look up client by VAPI assistant ID
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single()

    if (!client) {
      console.warn('VAPI webhook: no client found for assistantId', assistantId)
      return NextResponse.json({ received: true })
    }

    // Extract call data
    const callerNumber = call.customer?.number ?? null
    const durationSeconds = call.endedAt && call.startedAt
      ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      : null
    const transcript = call.transcript ?? null
    const calledAt = call.startedAt ?? new Date().toISOString()

    // Upsert call record (n8n may have already written it)
    await supabase.from('calls').upsert({
      client_id: client.id,
      vapi_call_id: call.id,
      caller_number: callerNumber,
      duration_seconds: durationSeconds,
      transcript,
      outcome: call.endedReason ?? 'completed',
      called_at: calledAt,
    }, { onConflict: 'vapi_call_id' })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('VAPI webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
