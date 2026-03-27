import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { redirect } from 'next/navigation'
import { vapiRequest } from '@/lib/vapi'
import TranscriptRow from './transcript-row'

type VapiCall = {
  id: string
  startedAt?: string
  endedAt?: string
  customer?: { number?: string }
  transcript?: string
  endedReason?: string
  summary?: string
  status?: string
}

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)

  let calls: VapiCall[] = []
  if (client?.vapi_assistant_id) {
    try {
      const result = await vapiRequest(`/call?assistantId=${client.vapi_assistant_id}&limit=100`, 'GET')
      calls = Array.isArray(result) ? result : []
    } catch (err) {
      console.error('VAPI call fetch failed:', err)
      calls = []
    }
  }

  const normalised = calls.map((c) => {
    const durationSeconds = c.startedAt && c.endedAt
      ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000)
      : null
    return {
      id: c.id,
      called_at: c.startedAt ?? null,
      duration_seconds: durationSeconds,
      caller_number: c.customer?.number ?? null,
      transcript: c.transcript ?? null,
      outcome: c.endedReason ?? null,
      ai_summary: c.summary ?? null,
    }
  })

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Call Logs</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Every call your AI employee has handled. Click a row to read the transcript.
        </p>
      </div>

      <div style={card} className="overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <span className="text-sm font-medium" style={{ color: '#888' }}>{normalised.length} calls</span>
        </div>
        <div className="px-6">
          {!normalised.length ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No calls yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Calls will appear here once your agent goes live.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Date</th>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Caller</th>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Duration</th>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Outcome</th>
                  <th className="text-left py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {normalised.map((call) => (
                  <TranscriptRow key={call.id} call={call} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
