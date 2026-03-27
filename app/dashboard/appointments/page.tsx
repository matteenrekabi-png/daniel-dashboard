import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BusinessHoursEditor from './business-hours-editor'
import { parseHoursFromKBSection, DEFAULT_HOURS } from '@/lib/business-hours'
import { KBSections } from '@/lib/gemini-kb'

type StoredKB = KBSections & { _vapiFileId?: string }

type Appointment = {
  id: string
  appointment_date: string | null
  appointment_time: string | null
  caller_name: string | null
  caller_number: string | null
  service_type: string | null
  status: string
  notes: string | null
}

function formatAppointmentDate(date: string | null, time: string | null) {
  if (!date) return '—'
  const d = new Date(date + (time ? `T${time}` : ''))
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    (time ? ` at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '')
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  const admin = createAdminClient()

  // Fetch all appointments for this client
  const { data: appointments } = client ? await admin
    .from('appointments')
    .select('id, appointment_date, appointment_time, caller_name, caller_number, service_type, status, notes')
    .eq('client_id', client.id)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false }) : { data: null }

  // Load business hours for the editor section
  let initialHours = DEFAULT_HOURS
  if (client) {
    const { data: kb } = await admin
      .from('knowledge_base')
      .select('sections')
      .eq('client_id', client.id)
      .single()

    const stored = kb?.sections as StoredKB | null
    const bhSection = stored?.sections?.find(s => s.key === 'business_hours')
    if (bhSection?.content) {
      initialHours = parseHoursFromKBSection(bhSection.content)
    }
  }

  const apptList: Appointment[] = (appointments ?? []) as Appointment[]

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  const statusStyle = (status: string) => {
    if (status === 'confirmed') return { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
    if (status === 'cancelled' || status === 'canceled') return { background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d44' }
    return { background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }
  }

  return (
    <div className="space-y-10">

      {/* ── Appointments ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Appointments</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>
            Every booking your AI employee has taken. Caller info is pulled directly from the call.
          </p>
        </div>

        <div style={card} className="overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <span className="text-sm font-medium" style={{ color: '#888' }}>{apptList.length} appointments</span>
          </div>

          {!apptList.length ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No appointments yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Bookings will appear here after calls where your agent schedules an appointment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Date & Time</th>
                    <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Caller</th>
                    <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Phone</th>
                    <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Service</th>
                    <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Status</th>
                    <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {apptList.map((appt) => (
                    <tr key={appt.id} style={{ borderBottom: '1px solid #111' }}>
                      <td className="px-6 py-3 text-xs whitespace-nowrap" style={{ color: '#888' }}>
                        {formatAppointmentDate(appt.appointment_date, appt.appointment_time)}
                      </td>
                      <td className="py-3 pr-6 text-sm font-medium" style={{ color: '#ededed' }}>
                        {appt.caller_name ?? '—'}
                      </td>
                      <td className="py-3 pr-6 text-xs font-mono" style={{ color: '#666' }}>
                        {appt.caller_number ?? '—'}
                      </td>
                      <td className="py-3 pr-6 text-xs" style={{ color: '#888' }}>
                        {appt.service_type ?? '—'}
                      </td>
                      <td className="py-3 pr-6">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={statusStyle(appt.status)}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3 pr-6 text-xs max-w-xs" style={{ color: '#555' }}>
                        {appt.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Business Hours ───────────────────────────────────────── */}
      <div className="space-y-4 max-w-2xl">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#ededed' }}>Business Hours</h2>
          <p className="text-sm mt-1" style={{ color: '#555' }}>
            Set when you&apos;re open. Your AI employee uses this to answer scheduling questions accurately.
          </p>
        </div>
        <BusinessHoursEditor initialHours={initialHours} />
      </div>

    </div>
  )
}
