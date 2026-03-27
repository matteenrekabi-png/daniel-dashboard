'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Settings {
  id?: string
  available_days: Record<string, boolean>
  time_window_start: string
  time_window_end: string
  booking_buffer_minutes: number
  max_appointments_per_day: number
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_DAYS: Record<string, boolean> = {
  monday: true, tuesday: true, wednesday: true,
  thursday: true, friday: true, saturday: false, sunday: false,
}

export default function AppointmentSettingsForm({ settings }: { settings: Settings | null }) {
  const [days, setDays] = useState<Record<string, boolean>>(
    (settings?.available_days as Record<string, boolean>) ?? DEFAULT_DAYS
  )
  const [start, setStart] = useState(settings?.time_window_start?.slice(0, 5) ?? '08:00')
  const [end, setEnd] = useState(settings?.time_window_end?.slice(0, 5) ?? '18:00')
  const [buffer, setBuffer] = useState(settings?.booking_buffer_minutes ?? 30)
  const [maxPerDay, setMaxPerDay] = useState(settings?.max_appointments_per_day ?? 8)
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch('/api/appointments/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        available_days: days,
        time_window_start: start,
        time_window_end: end,
        booking_buffer_minutes: buffer,
        max_appointments_per_day: maxPerDay,
      }),
    })

    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Save failed')
    else toast.success('Appointment settings saved')
    setSaving(false)
  }

  const inputStyle = {
    background: '#0a0a0a',
    border: '1px solid #1f1f1f',
    color: '#ededed',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }} className="overflow-hidden">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Booking Settings</p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Available days */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Available Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDays({ ...days, [day]: !days[day] })}
                  className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
                  style={days[day]
                    ? { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
                    : { background: '#1a1a1a', color: '#555', border: '1px solid #2a2a2a' }
                  }
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Time window */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Opens</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Closes</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
              />
            </div>
          </div>

          {/* Buffer + max */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Buffer (minutes)</label>
              <input
                type="number"
                min={0}
                max={240}
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Max / Day</label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(Number(e.target.value))}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{ background: saving ? '#1d4ed8' : '#2563eb', color: '#fff', opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
