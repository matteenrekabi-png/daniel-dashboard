import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { vapiRequest } from '@/lib/vapi'

type VapiCall = {
  id: string
  startedAt?: string
  endedAt?: string
  customer?: { number?: string }
  endedReason?: string
  summary?: string
}

type Appointment = {
  id: string
  caller_name: string | null
  caller_phone: string | null
  service_type: string | null
  appointment_date: string | null
  appointment_time: string | null
  status: string
  created_at: string
}

function formatDate(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startedAt?: string, endedAt?: string) {
  if (!startedAt || !endedAt) return '—'
  const s = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  if (!s) return '—'
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const statusStyle = (status: string) => {
  if (status === 'confirmed') return { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
  if (status === 'cancelled' || status === 'canceled') return { background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d44' }
  if (status === 'rescheduled') return { background: '#2a1f0a', color: '#fbbf24', border: '1px solid #78350f44' }
  return { background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  const admin = createAdminClient()

  // Pull calls from VAPI directly
  let calls: VapiCall[] = []
  if (client?.vapi_assistant_id) {
    try {
      const result = await vapiRequest(`/call?assistantId=${client.vapi_assistant_id}&limit=100`, 'GET')
      calls = Array.isArray(result) ? result : []
    } catch {
      calls = []
    }
  }

  // Pull appointments from Supabase
  const { data: appointments } = client ? await admin
    .from('appointments')
    .select('id, caller_name, caller_phone, service_type, appointment_date, appointment_time, status, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(20) : { data: null }

  const apptList: Appointment[] = (appointments ?? []) as Appointment[]
  const recentCalls = calls.slice(0, 5)
  const recentAppts = apptList.slice(0, 5)
  const totalCalls = calls.length
  const totalConfirmed = apptList.filter(a => a.status === 'confirmed').length

  // Build activity feed: merge calls + appointments, sort by time
  type ActivityItem = { ts: string; label: string; sub: string; dot: string }
  const activity: ActivityItem[] = []

  for (const c of calls.slice(0, 15)) {
    if (!c.startedAt) continue
    activity.push({
      ts: c.startedAt,
      label: 'Incoming call',
      sub: `${c.customer?.number ?? 'Unknown'} — ${formatDuration(c.startedAt, c.endedAt)}`,
      dot: '#2563eb',
    })
  }
  for (const a of apptList.slice(0, 15)) {
    const label =
      a.status === 'confirmed' ? 'Appointment booked' :
      a.status === 'rescheduled' ? 'Appointment rescheduled' :
      a.status === 'cancelled' || a.status === 'canceled' ? 'Appointment cancelled' :
      'Appointment updated'
    const dotColor =
      a.status === 'confirmed' ? '#34d399' :
      a.status === 'rescheduled' ? '#fbbf24' : '#f87171'
    activity.push({
      ts: a.created_at,
      label,
      sub: `${a.caller_name ?? 'Unknown'} — ${a.service_type ?? 'Service'}${a.appointment_date ? ` · ${new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`,
      dot: dotColor,
    })
  }
  activity.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  const activityFeed = activity.slice(0, 12)

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Your AI employee at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={card} className="p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>Total Calls</p>
          <p className="text-4xl font-bold" style={{ color: '#2563eb' }}>{totalCalls}</p>
        </div>
        <div style={card} className="p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>Appointments Booked</p>
          <p className="text-4xl font-bold" style={{ color: '#2563eb' }}>{totalConfirmed}</p>
        </div>
        <div style={card} className="p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>Agent Status</p>
          {client?.vapi_assistant_id ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#0f2a1a', color: '#34d399', border: '1px solid #065f46' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 6px #34d399' }} />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#1a1a1a', color: '#888888' }}>
              Not connected
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Calls */}
        <div style={card} className="p-6 lg:col-span-1">
          <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Recent Calls</p>
          {!recentCalls.length ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No calls yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Calls will appear here once your agent goes live.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-mono truncate" style={{ color: '#ccc' }}>
                      {call.customer?.number ?? 'Unknown'}
                    </span>
                    <span className="text-xs" style={{ color: '#555' }}>
                      {formatDate(call.startedAt ?? null)}
                    </span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: '#555' }}>
                    {formatDuration(call.startedAt, call.endedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        <div style={card} className="p-6 lg:col-span-1">
          <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Recent Appointments</p>
          {!recentAppts.length ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No appointments yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Booked appointments will show up here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppts.map((appt) => (
                <div key={appt.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#ededed' }}>{appt.caller_name ?? 'Unknown'}</p>
                    <p className="text-xs truncate" style={{ color: '#555' }}>
                      {appt.service_type ?? '—'}
                      {appt.appointment_date ? ` · ${new Date(appt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                      {appt.appointment_time ? ` ${new Date(`1970-01-01T${appt.appointment_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" style={statusStyle(appt.status)}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div style={card} className="p-6 lg:col-span-1">
          <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Activity</p>
          {!activityFeed.length ? (
            <p className="text-sm" style={{ color: '#555' }}>No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: item.dot }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#ccc' }}>{item.label}</p>
                    <p className="text-xs truncate" style={{ color: '#555' }}>{item.sub}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#333' }}>{timeAgo(item.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
