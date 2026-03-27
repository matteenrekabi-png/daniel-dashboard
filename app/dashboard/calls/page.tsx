import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { vapiRequest } from '@/lib/vapi'
import CallsClient from './calls-client'

type VapiCall = {
  id: string
  startedAt?: string
  endedAt?: string
  customer?: { number?: string }
  transcript?: string
  endedReason?: string
  summary?: string
}

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  const admin = createAdminClient()

  // Get hidden call IDs for this client
  const { data: hidden } = client ? await admin
    .from('hidden_calls')
    .select('vapi_call_id')
    .eq('client_id', client.id) : { data: null }

  const hiddenIds = new Set((hidden ?? []).map((h: { vapi_call_id: string }) => h.vapi_call_id))

  let calls: VapiCall[] = []
  if (client?.vapi_assistant_id) {
    try {
      const result = await vapiRequest(`/call?assistantId=${client.vapi_assistant_id}&limit=100`, 'GET')
      calls = Array.isArray(result) ? result : []
    } catch (err) {
      console.error('VAPI call fetch failed:', err)
    }
  }

  const normalised = calls
    .filter(c => !hiddenIds.has(c.id))
    .map((c) => ({
      id: c.id,
      called_at: c.startedAt ?? null,
      duration_seconds: c.startedAt && c.endedAt
        ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000)
        : null,
      caller_number: c.customer?.number ?? null,
      transcript: c.transcript ?? null,
      outcome: c.endedReason ?? null,
      ai_summary: c.summary ?? null,
    }))

  return <CallsClient calls={normalised} />
}
