'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

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

function formatDate(date: string | null, time: string | null) {
  if (!date) return '—'
  const d = new Date(date + (time ? `T${time}` : ''))
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    (time ? ` at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '')
}

const statusStyle = (status: string) => {
  if (status === 'confirmed') return { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
  if (status === 'cancelled' || status === 'canceled') return { background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d44' }
  if (status === 'rescheduled') return { background: '#2a1f0a', color: '#fbbf24', border: '1px solid #78350f44' }
  return { background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }
}

function AppointmentRow({ appt, onDelete }: { appt: Appointment; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm) { setConfirm(true); return }
    setDeleting(true)
    const res = await fetch(`/api/appointments/${appt.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(appt.id)
    else setDeleting(false)
  }

  return (
    <tr style={{ borderBottom: '1px solid #111' }}>
      <td className="px-6 py-3 text-xs whitespace-nowrap" style={{ color: '#888' }}>
        {formatDate(appt.appointment_date, appt.appointment_time)}
        {appt.time_window && <span className="block text-xs mt-0.5" style={{ color: '#444' }}>{appt.time_window}</span>}
      </td>
      <td className="py-3 pr-6 text-sm font-medium" style={{ color: '#ededed' }}>{appt.caller_name ?? '—'}</td>
      <td className="py-3 pr-6 text-xs font-mono" style={{ color: '#666' }}>{appt.caller_phone ?? '—'}</td>
      <td className="py-3 pr-6 text-xs" style={{ color: '#888' }}>{appt.service_type ?? '—'}</td>
      <td className="py-3 pr-6 text-xs max-w-xs" style={{ color: '#555' }}>{appt.address ?? '—'}</td>
      <td className="py-3 pr-6 text-xs max-w-xs" style={{ color: '#555' }}>{appt.issue_description ?? '—'}</td>
      <td className="py-3 pr-4">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={statusStyle(appt.status)}>
          {appt.status}
        </span>
      </td>
      <td className="py-3 pr-4 text-right">
        {confirm ? (
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs" style={{ color: '#f87171' }}>Delete?</span>
            <button onClick={handleDelete} disabled={deleting} className="text-xs px-2 py-1 rounded" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
              {deleting ? '…' : 'Yes'}
            </button>
            <button onClick={() => setConfirm(false)} className="text-xs px-2 py-1 rounded" style={{ background: '#1a1a1a', color: '#666' }}>
              No
            </button>
          </div>
        ) : (
          <button onClick={handleDelete} className="p-1 rounded" style={{ color: '#333' }} title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}

export default function AppointmentsList({ appointments: initial }: { appointments: Appointment[] }) {
  const [appointments, setAppointments] = useState(initial)

  if (!appointments.length) {
    return (
      <div className="py-12 text-center space-y-1">
        <p className="text-sm" style={{ color: '#555' }}>No appointments yet.</p>
        <p className="text-xs" style={{ color: '#333' }}>Bookings will appear here after calls where your agent schedules an appointment.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
            <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Date & Time</th>
            <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Caller</th>
            <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Phone</th>
            <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Service</th>
            <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Address</th>
            <th className="text-left py-3 pr-6 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Issue</th>
            <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt) => (
            <AppointmentRow key={appt.id} appt={appt} onDelete={(id) => setAppointments(prev => prev.filter(a => a.id !== id))} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
