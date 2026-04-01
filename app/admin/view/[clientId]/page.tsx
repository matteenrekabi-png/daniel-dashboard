import type React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { vapiRequest } from '@/lib/vapi'
import Link from 'next/link'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

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
  updated_at: string | null
}

function formatDate(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startedAt?: string, endedAt?: string) {
  if (!startedAt || !endedAt) return null
  const s = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  if (s < 1) return null
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

export default async function AdminViewDashboard({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params

  // Verify the viewer is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/login')

  const admin = createAdminClient()

  // Fetch the client by ID
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/admin')

  // Hidden calls
  const { data: hidden } = await admin
    .from('hidden_calls')
    .select('vapi_call_id')
    .eq('client_id', client.id)
  const hiddenIds = new Set((hidden ?? []).map((h: { vapi_call_id: string }) => h.vapi_call_id))

  // Pull calls from VAPI
  let allCalls: VapiCall[] = []
  if (client.vapi_assistant_id) {
    try {
      const result = await vapiRequest(`/call?assistantId=${client.vapi_assistant_id}&limit=100`, 'GET')
      allCalls = Array.isArray(result) ? result : []
    } catch {
      allCalls = []
    }
  }
  const calls = allCalls.filter(c => !hiddenIds.has(c.id))

  // Pull appointments
  const { data: appointments } = await admin
    .from('appointments')
    .select('id, caller_name, caller_phone, service_type, appointment_date, appointment_time, status, created_at, updated_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const apptList: Appointment[] = (appointments ?? []) as Appointment[]

  const totalCalls = calls.length
  const totalConfirmed = apptList.filter(a => a.status === 'confirmed').length
  const recentConversations = calls.slice(0, 5)
  const recentAppts = apptList.slice(0, 5)

  type ActivityItem = { ts: string; label: string; sub: string; dot: string }
  const activity: ActivityItem[] = []

  for (const c of calls.slice(0, 15)) {
    if (!c.startedAt) continue
    const dur = formatDuration(c.startedAt, c.endedAt)
    activity.push({ ts: c.startedAt, label: 'Incoming call', sub: dur ? `${dur} call` : 'Call received', dot: '#2563eb' })
  }

  for (const a of apptList.slice(0, 15)) {
    const name = a.caller_name ?? 'Unknown'
    const svc = a.service_type ?? 'Service'
    const dateStr = a.appointment_date
      ? ` · ${new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : ''
    activity.push({ ts: a.created_at, label: 'Appointment booked', sub: `${name} — ${svc}${dateStr}`, dot: '#34d399' })
    if (a.status === 'cancelled' || a.status === 'canceled') {
      activity.push({ ts: a.updated_at ?? a.created_at, label: 'Appointment cancelled', sub: `${name} — ${svc}`, dot: '#f87171' })
    } else if (a.status === 'rescheduled') {
      activity.push({ ts: a.updated_at ?? a.created_at, label: 'Appointment rescheduled', sub: `${name} — ${svc}`, dot: '#fbbf24' })
    }
  }

  activity.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  const activityFeed = activity.slice(0, 12)

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 } as const

  return (
    <div className="min-h-screen" style={{ background: '#141414' }}>
      {/* Admin banner */}
      <div style={{ background: '#1e3a5f', borderBottom: '1px solid #2563eb44', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />
          <span style={{ color: '#93c5fd', fontSize: 13, fontWeight: 500 }}>
            Viewing as admin — {client.business_name}
          </span>
        </div>
        <Link
          href="/admin"
          style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none', border: '1px solid #2563eb44', borderRadius: 6, padding: '4px 10px' }}
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Dashboard shell */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }} className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#ededed' }}>{client.business_name}</p>
            <p className="text-xs" style={{ color: '#555' }}>AI Employee</p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-6xl mx-auto">
        <style>{`
          @keyframes statCardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          @keyframes rowIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes greenPulseDot { 0%,100% { box-shadow:0 0 0 0 #34d39966; } 50% { box-shadow:0 0 0 5px transparent; } }
          .convo-row { transition:background 0.15s; border-bottom:1px solid #141414; }
          .convo-row:last-child { border-bottom:none; }
          .convo-row:hover { background:#111 !important; }
          .appt-row { transition:background 0.15s; border-bottom:1px solid #141414; }
          .appt-row:last-child { border-bottom:none; }
          .appt-row:hover { background:#111 !important; }
        `}</style>

        <div style={{ animation: 'statCardIn 0.2s ease both' }}>
          <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Overview</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Your AI employee at a glance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Calls', value: totalCalls, color: '#2563eb', delay: '0.05s' },
            { label: 'Appointments Booked', value: totalConfirmed, color: '#2563eb', delay: '0.1s' },
          ].map((stat) => (
            <div key={stat.label} className="p-6" style={{ ...card, animation: `statCardIn 0.3s ease both`, animationDelay: stat.delay }}>
              <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>{stat.label}</p>
              <p className="text-4xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}

          <div className="p-6" style={{ ...card, animation: 'statCardIn 0.3s ease both', animationDelay: '0.15s' }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>Agent Status</p>
            {client.vapi_assistant_id ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#0f2a1a', color: '#34d399', border: '1px solid #065f46' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'greenPulseDot 2s ease infinite' }} />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#1a1a1a', color: '#888888' }}>Not connected</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Conversations */}
          <div className="p-6 lg:col-span-1" style={{ ...card, animation: 'statCardIn 0.35s ease both', animationDelay: '0.1s' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Recent Conversations</p>
            {!recentConversations.length ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-sm" style={{ color: '#555' }}>No calls yet.</p>
                <p className="text-xs" style={{ color: '#333' }}>Conversations will appear here once the agent goes live.</p>
              </div>
            ) : (
              <div>
                {recentConversations.map((call, idx) => {
                  const dur = formatDuration(call.startedAt, call.endedAt)
                  const hasSum = !!call.summary
                  return (
                    <div key={call.id} className="convo-row py-3 px-2 rounded-lg" style={{ animation: 'rowIn 0.25s ease both', animationDelay: `${0.05 * idx}s` }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs" style={{ color: '#555' }}>{formatDate(call.startedAt ?? null)}</span>
                        {dur && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#1a1a1a', color: '#666', border: '1px solid #2a2a2a' }}>{dur}</span>}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: hasSum ? '#888' : '#383838', fontStyle: hasSum ? 'normal' : 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                        {call.summary ?? 'No summary available'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Appointments */}
          <div className="p-6 lg:col-span-1" style={{ ...card, animation: 'statCardIn 0.35s ease both', animationDelay: '0.15s' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Recent Appointments</p>
            {!recentAppts.length ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-sm" style={{ color: '#555' }}>No appointments yet.</p>
                <p className="text-xs" style={{ color: '#333' }}>Booked appointments will show up here automatically.</p>
              </div>
            ) : (
              <div>
                {recentAppts.map((appt, idx) => (
                  <div key={appt.id} className="appt-row flex items-start justify-between gap-2 py-3 px-2 rounded-lg" style={{ animation: 'rowIn 0.25s ease both', animationDelay: `${0.05 * idx}s` }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#ededed' }}>{appt.caller_name ?? 'Unknown'}</p>
                      <p className="text-xs truncate" style={{ color: '#555' }}>
                        {appt.service_type ?? '—'}
                        {appt.appointment_date ? ` · ${new Date(appt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                        {appt.appointment_time ? ` ${new Date(`1970-01-01T${appt.appointment_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" style={{ ...statusStyle(appt.status), animationDelay: `${0.1 + 0.05 * idx}s` }}>
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="p-6 lg:col-span-1" style={{ ...card, animation: 'statCardIn 0.35s ease both', animationDelay: '0.2s' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Activity</p>
            {!activityFeed.length ? (
              <p className="text-sm" style={{ color: '#555' }}>No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((item, i) => (
                  <div key={i} className="flex gap-3" style={{ animation: 'rowIn 0.2s ease both', animationDelay: `${0.03 * i}s` }}>
                    <div className="mt-1.5 shrink-0" style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot, boxShadow: `0 0 6px ${item.dot}88`, flexShrink: 0 }} />
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
    </div>
  )
}
