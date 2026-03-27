import { createClient } from '@/lib/supabase/server'
import TranscriptRow from './transcript-row'

export default async function CallsPage() {
  const supabase = await createClient()

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .order('called_at', { ascending: false })
    .limit(100)

  function formatDuration(seconds: number | null) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  function formatDate(ts: string | null) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Call Logs</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Every call your AI receptionist has handled. Click a row to read the transcript.
        </p>
      </div>

      <div style={card} className="overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <span className="text-sm font-medium" style={{ color: '#888' }}>{calls?.length ?? 0} calls</span>
        </div>
        <div className="px-6">
          {!calls?.length ? (
            <p className="text-sm py-12 text-center" style={{ color: '#555' }}>
              No calls logged yet.
            </p>
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
                {calls.map((call) => (
                  <TranscriptRow key={call.id} call={call} formatDate={formatDate} formatDuration={formatDuration} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
