import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .single()

  const { data: calls } = await supabase
    .from('calls')
    .select('id, called_at, duration_seconds, outcome, caller_number')
    .order('called_at', { ascending: false })
    .limit(5)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, caller_name, service_type, status')
    .order('appointment_date', { ascending: false })
    .limit(5)

  const { count: totalCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })

  const { count: totalAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed')

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Your AI receptionist at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={card} className="p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>Total Calls</p>
          <p className="text-4xl font-bold" style={{ color: '#2563eb' }}>{totalCalls ?? 0}</p>
        </div>
        <div style={card} className="p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#555' }}>Appointments Booked</p>
          <p className="text-4xl font-bold" style={{ color: '#2563eb' }}>{totalAppointments ?? 0}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent calls */}
        <div style={card} className="p-6">
          <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Recent Calls</p>
          {!calls?.length ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No calls yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Calls will appear here once your agent goes live.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate" style={{ color: '#ccc' }}>
                      {call.caller_number ?? 'Unknown caller'}
                    </span>
                    <span className="text-xs" style={{ color: '#555' }}>
                      {call.called_at ? new Date(call.called_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs" style={{ color: '#555' }}>
                      {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }}>
                      {call.outcome ?? 'completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent appointments */}
        <div style={card} className="p-6">
          <p className="text-sm font-semibold mb-4" style={{ color: '#ededed' }}>Recent Appointments</p>
          {!appointments?.length ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No appointments yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Booked appointments will show up here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: '#ededed' }}>{appt.caller_name}</span>
                  <span className="text-xs truncate" style={{ color: '#555' }}>{appt.service_type}</span>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
                    style={appt.status === 'confirmed'
                      ? { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
                      : { background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }
                    }
                  >
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
