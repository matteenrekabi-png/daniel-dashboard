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

// ROI assumptions — tune per client. Defaults model home-services economics:
// roughly 1 in 2 inbound calls becomes a paying job, average ticket ~$1,500.
const CONVERSION_RATE = 0.5
const AVG_JOB_VALUE_USD = 1500

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

  // ── ROI estimate ────────────────────────────────────────────────────────
  // Of every N calls answered, ~half become paying jobs (industry-typical for
  // home services). Each captured job is worth the average ticket value.
  const convertedJobs = Math.round(calls.length * CONVERSION_RATE)
  const revenueGenerated = convertedJobs * AVG_JOB_VALUE_USD
  const revenueFormatted = `$${revenueGenerated.toLocaleString('en-US')}`

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
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes heroGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(34,197,94,0.18), inset 0 0 60px rgba(22,163,74,0.05); }
          50%      { box-shadow: 0 0 60px rgba(34,197,94,0.32), inset 0 0 80px rgba(22,163,74,0.08); }
        }
        @keyframes livePulse {
          0%, 100% { transform: scale(1);   opacity: 1;   box-shadow: 0 0 0 0   rgba(34,197,94,0.6); }
          50%      { transform: scale(1.2); opacity: 0.85; box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
        @keyframes floatDollar {
          0%, 100% { transform: translateY(0)    rotate(var(--rot, 0deg)); }
          50%      { transform: translateY(-8px) rotate(calc(var(--rot, 0deg) + 4deg)); }
        }
        @keyframes valueShine {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .metric-card { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .metric-card:hover { border-color: #2a2a2a !important; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
        .bar-col { transition: height 0.4s ease; }

        .roi-hero {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 32px;
          background:
            radial-gradient(ellipse at top right, rgba(22,163,74,0.18), transparent 60%),
            radial-gradient(ellipse at bottom left, rgba(250,204,21,0.06), transparent 55%),
            linear-gradient(135deg, #0a1410 0%, #0a0f0a 50%, #131c12 100%);
          border: 1px solid rgba(34,197,94,0.28);
          animation: heroIn 0.45s ease both, heroGlow 4.5s ease-in-out infinite 0.45s;
        }
        .roi-hero::before {
          content: '';
          position: absolute; inset: 0;
          background:
            repeating-linear-gradient(45deg, transparent 0 22px, rgba(34,197,94,0.025) 22px 23px);
          pointer-events: none;
        }
        .roi-deco {
          position: absolute;
          color: rgba(34,197,94,0.12);
          pointer-events: none;
          animation: floatDollar 5s ease-in-out infinite;
        }
        .roi-value {
          font-size: clamp(48px, 9vw, 72px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -1.5px;
          margin: 0;
          background: linear-gradient(90deg, #4ade80 0%, #22c55e 30%, #facc15 50%, #22c55e 70%, #4ade80 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 50px rgba(34,197,94,0.35);
          animation: valueShine 5s linear infinite;
        }
        .roi-live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          animation: livePulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-8 max-w-4xl">
        <div style={{ animation: 'statCardIn 0.2s ease both' }}>
          <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Metrics</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Performance breakdown for your AI employee</p>
        </div>

        {/* ── ROI Hero ─────────────────────────────────────────────────── */}
        <div className="roi-hero">
          {/* Decorative floating dollar signs in the background */}
          <svg className="roi-deco" style={{ top: 24, right: 32, width: 92, height: 92, ['--rot' as string]: '-12deg' } as React.CSSProperties} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <svg className="roi-deco" style={{ bottom: 18, right: 120, width: 56, height: 56, ['--rot' as string]: '14deg', animationDelay: '1.4s' } as React.CSSProperties} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <svg className="roi-deco" style={{ top: 80, right: 200, width: 38, height: 38, ['--rot' as string]: '-22deg', animationDelay: '2.6s' } as React.CSSProperties} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {/* Stack-of-bills icon */}
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <circle cx="12" cy="12" r="2.5"/>
                  <path d="M6 10v.01M18 10v.01M6 14v.01M18 14v.01"/>
                </svg>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#86efac', textTransform: 'uppercase', margin: 0 }}>
                Estimated Revenue Generated
              </p>
            </div>

            <p className="roi-value">{revenueFormatted}</p>

            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="roi-live-dot" />
              <p style={{ fontSize: 13, color: '#bbf7d0', margin: 0 }}>
                <strong style={{ color: '#4ade80' }}>~{convertedJobs.toLocaleString('en-US')} paying jobs</strong> captured by your AI · ~1 in 2 calls converts at <strong style={{ color: '#facc15' }}>${AVG_JOB_VALUE_USD.toLocaleString('en-US')}</strong> avg ticket
              </p>
            </div>

            {!calls.length && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#4b5563' }}>
                Numbers will start climbing as soon as your agent takes its first call.
              </p>
            )}
          </div>
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
