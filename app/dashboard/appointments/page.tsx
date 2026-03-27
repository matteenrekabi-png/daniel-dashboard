import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BusinessHoursEditor from './business-hours-editor'
import AppointmentsList from './appointments-list'
import { parseHoursFromKBSection, DEFAULT_HOURS } from '@/lib/business-hours'
import { KBSections } from '@/lib/gemini-kb'

type StoredKB = KBSections & { _vapiFileId?: string }

type Appointment = {
  id: string
  appointment_date: string | null
  appointment_time: string | null
  caller_name: string | null
  caller_phone: string | null
  service_type: string | null
  address: string | null
  issue_description: string | null
  time_window: string | null
  status: string
  notes: string | null
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
    .select('id, appointment_date, appointment_time, caller_name, caller_phone, service_type, address, issue_description, time_window, status, notes')
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

          <AppointmentsList appointments={apptList} />
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
