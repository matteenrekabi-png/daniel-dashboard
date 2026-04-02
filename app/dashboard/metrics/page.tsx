import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { vapiRequest } from '@/lib/vapi'
import { redirect } from 'next/navigation'

type VapiCall = {
  id: string
  startedAt?: string
  endedAt?: string
}

const PST = 'America/Los_Angeles'

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return sorted.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
}

function avg(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function fmtSeconds(s: number): string {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  if (m === 0) return `${sec}s`
  return `${m}m ${sec}s`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function MetricsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  const admin = createAdminClient()

  const { data: hidden } = client ? await admin
    .from('hidden_calls')
    .select('vapi_call_id')
    .eq('client_id', client.id) : { data: null }
  const hiddenIds = new Set((hidden ?? []).map((h: { vapi_call_id: string }) => h.vapi_call_id))

  let allCalls: VapiCall[] = []
  if (client?.vapi_assistant_id) {
    try {
      const result = await vapiRequest(`/call?assistantId=${client.vapi_assistant_id}&limit=1000`, 'GET')
      allCalls = Array.isArray(result) ? result : []
    } catch {
      allCalls = []
    }
  }
  const calls = allCalls.filter(c => !hiddenIds.has(c.id) && c.startedAt)

  // Average call duration (outliers removed)
  const durations = calls
    .filter(c => c.startedAt && c.endedAt)
    .map(c => (new Date(c.endedAt!).getTime() - new Date(c.startedAt!).getTime()) / 1000)
    .filter(d => d > 0)
  const cleanDurations = removeOutliers(durations)
  const avgDuration = avg(cleanDurations)

  // Calls per week
  const callsByWeek: Record<string, number> = {}
  for (const c of calls) {
    const d = new Date(c.startedAt!)
    // Get Monday of that week in PST
    const pstDate = new Date(d.toLocaleString('en-US', { timeZone: PST }))
    const dow = pstDate.getDay()
    const daysToMon = dow === 0 ? 6 : dow - 1
    const mon = new Date(pstDate)
    mon.setDate(pstDate.getDate() - daysToMon)
    const key = mon.toLocaleDateString('en-CA', { timeZone: PST })
    callsByWeek[key] = (callsByWeek[key] ?? 0) + 1
  }
  const weekCounts = Object.values(callsByWeek)
  const avgCallsPerWeek = avg(weekCounts)

  // Booking rate
  const { data: appts } = client ? await admin
    .from('appointments')
    .select('status, created_at')
    .eq('client_id', client.id) : { data: null }
  const totalAppts = (appts ?? []).length
  const bookingRate = calls.length > 0 ? Math.round((totalAppts / calls.length) * 100) : 0

  // Busiest day of week
  const callsByDay: number[] = [0, 0, 0, 0, 0, 0, 0]
  for (const c of calls) {
    const d = new Date(new Date(c.startedAt!).toLocaleString('en-US', { timeZone: PST }))
    callsByDay[d.getDay()]++
  }
  const busiestDayIdx = callsByDay.indexOf(Math.max(...callsByDay))

  // Busiest hour of day
  const callsByHour: number[] = Array(24).fill(0)
  for (const c of calls) {
    const d = new Date(new Date(c.startedAt!).toLocaleString('en-US', { timeZone: PST }))
    callsByHour[d.getHours()]++
  }
  const busiestHour = callsByHour.indexOf(Math.max(...callsByHour))
  const busiestHourStr = busiestHour === 0 ? '12 AM'
    : busiestHour < 12 ? `${busiestHour} AM`
    : busiestHour === 12 ? '12 PM'
    : `${busiestHour - 12} PM`

  // Calls last 7 days by day for bar chart
  const last7: { label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: PST }))
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-CA')
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yest' : DAYS[d.getDay()]
    const count = calls.filter(c => {
      const cd = new Date(c.startedAt!).toLocaleDateString('en-CA', { timeZone: PST })
      return cd === key
    }).length
    last7.push({ label: dayLabel, count })
  }
  const maxLast7 = Math.max(...last7.map(d => d.count), 1)

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 } as const

  const statCards = [
    { label: 'Avg Call Duration', value: fmtSeconds(avgDuration), sub: `Based on ${cleanDurations.length} calls, outliers removed` },
    { label: 'Avg Calls / Week', value: avgCallsPerWeek ? avgCallsPerWeek.toFixed(1) : '—', sub: `Across ${weekCounts.length} week${weekCounts.length !== 1 ? 's' : ''} of data` },
    { label: 'Booking Rate', value: `${bookingRate}%`, sub: `${totalAppts} appointments from ${calls.length} calls` },
    { label: 'Busiest Day', value: calls.length ? DAYS[busiestDayIdx] : '—', sub: `${callsByDay[busiestDayIdx]} calls on average` },
    { label: 'Busiest Hour', value: calls.length ? busiestHourStr : '—', sub: 'Most calls start around this time' },
    { label: 'Total Calls', value: calls.length, sub: 'All time' },
  ]

  return (
    <>
      <style>{`
        @keyframes statCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .metric-card { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .metric-card:hover { border-color: #2a2a2a !important; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
        .bar-col { transition: height 0.4s ease; }
      `}</style>

      <div className="space-y-8 max-w-4xl">
        <div style={{ animation: 'statCardIn 0.2s ease both' }}>
          <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Metrics</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Performance breakdown for your AI employee</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statCards.map((s, i) => (
            <div
              key={s.label}
              className="metric-card p-5"
              style={{ ...card, animation: 'statCardIn 0.3s ease both', animationDelay: `${0.05 * i}s` }}
            >
              <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#555' }}>{s.label}</p>
              <p className="text-3xl font-bold mb-1" style={{ color: '#2563eb' }}>{s.value}</p>
              <p className="text-xs" style={{ color: '#333' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Calls last 7 days bar chart */}
        <div
          className="metric-card p-6"
          style={{ ...card, animation: 'statCardIn 0.3s ease both', animationDelay: '0.3s' }}
        >
          <p className="text-sm font-semibold mb-6" style={{ color: '#ededed' }}>Calls — Last 7 Days</p>
          <div className="flex items-end gap-3" style={{ height: 120 }}>
            {last7.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <p className="text-xs font-medium" style={{ color: '#555' }}>{d.count || ''}</p>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (d.count / maxLast7) * 80)}px`,
                    background: d.label === 'Today' ? '#2563eb' : '#1e3a5f',
                    border: d.label === 'Today' ? '1px solid #3b82f6' : '1px solid #1d4ed844',
                    transition: 'height 0.4s ease',
                  }}
                />
                <p className="text-xs" style={{ color: '#444' }}>{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        {!calls.length && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
            <p className="text-sm" style={{ color: '#555' }}>No call data yet. Metrics will populate once your agent starts taking calls.</p>
          </div>
        )}
      </div>
    </>
  )
}
