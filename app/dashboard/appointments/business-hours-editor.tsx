'use client'

import { useState } from 'react'
import { BusinessHoursData, DayKey, DAYS, DAY_LABELS } from '@/lib/business-hours'

export default function BusinessHoursEditor({ initialHours }: { initialHours: BusinessHoursData }) {
  const [hours, setHours] = useState<BusinessHoursData>(initialHours)
  const [newHoliday, setNewHoliday] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  function updateDay(day: DayKey, field: 'open' | 'close' | 'closed', value: string | boolean) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
    if (status !== 'idle') setStatus('idle')
  }

  function addHoliday() {
    const h = newHoliday.trim()
    if (!h || hours.holidays.includes(h)) return
    setHours(prev => ({ ...prev, holidays: [...prev.holidays, h] }))
    setNewHoliday('')
    if (status !== 'idle') setStatus('idle')
  }

  function removeHoliday(holiday: string) {
    setHours(prev => ({ ...prev, holidays: prev.holidays.filter(h => h !== holiday) }))
    if (status !== 'idle') setStatus('idle')
  }

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/business-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }
  const timeInput: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#ededed',
    padding: '5px 8px',
    fontSize: 13,
    outline: 'none',
    width: 110,
    colorScheme: 'dark',
  }
  const textInput: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#ededed',
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    flex: 1,
  }

  return (
    <div className="space-y-5">

      {/* Weekly schedule */}
      <div style={card}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <p className="text-sm font-medium" style={{ color: '#ededed' }}>Weekly Schedule</p>
        </div>

        <div className="px-5">
          {DAYS.map((day, i) => {
            const d = hours[day]
            const isLast = i === DAYS.length - 1
            return (
              <div
                key={day}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: isLast ? 'none' : '1px solid #141414' }}
              >
                {/* Day name */}
                <span
                  className="text-sm font-medium shrink-0"
                  style={{ width: 96, color: d.closed ? '#3a3a3a' : '#ededed' }}
                >
                  {DAY_LABELS[day]}
                </span>

                {/* Time range or closed label */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {d.closed ? (
                    <span className="text-sm" style={{ color: '#3a3a3a' }}>Closed</span>
                  ) : (
                    <>
                      <input
                        type="time"
                        value={d.open}
                        onChange={e => updateDay(day, 'open', e.target.value)}
                        style={timeInput}
                      />
                      <span className="text-xs shrink-0" style={{ color: '#444' }}>to</span>
                      <input
                        type="time"
                        value={d.close}
                        onChange={e => updateDay(day, 'close', e.target.value)}
                        style={timeInput}
                      />
                    </>
                  )}
                </div>

                {/* Closed toggle */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <span className="text-xs" style={{ color: '#444' }}>Closed</span>
                  <button
                    type="button"
                    aria-label={`Mark ${DAY_LABELS[day]} as ${d.closed ? 'open' : 'closed'}`}
                    aria-pressed={d.closed}
                    onClick={() => updateDay(day, 'closed', !d.closed)}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      background: d.closed ? '#2563eb' : '#252525',
                      border: '1px solid ' + (d.closed ? '#1d4ed8' : '#333'),
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 2,
                      left: d.closed ? 18 : 2,
                      transition: 'left 0.15s',
                    }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Holidays */}
      <div style={card}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <p className="text-sm font-medium" style={{ color: '#ededed' }}>Holidays</p>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>
            Your assistant will tell callers you are closed on these days.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Holiday chips */}
          <div className="flex flex-wrap gap-2 min-h-[28px]">
            {hours.holidays.length === 0 && (
              <span className="text-sm" style={{ color: '#444' }}>No holidays added yet.</span>
            )}
            {hours.holidays.map(holiday => (
              <div
                key={holiday}
                className="flex items-center gap-1.5 rounded-full text-xs"
                style={{
                  background: '#1a1a1a',
                  color: '#888',
                  border: '1px solid #2a2a2a',
                  padding: '4px 10px 4px 12px',
                }}
              >
                {holiday}
                <button
                  type="button"
                  aria-label={`Remove ${holiday}`}
                  onClick={() => removeHoliday(holiday)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#555',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '0 2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add holiday input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Holiday name (e.g. Easter, Black Friday)"
              value={newHoliday}
              onChange={e => setNewHoliday(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHoliday() } }}
              style={textInput}
            />
            <button
              type="button"
              onClick={addHoliday}
              disabled={!newHoliday.trim()}
              style={{
                background: newHoliday.trim() ? '#1e3a5f' : '#151515',
                color: newHoliday.trim() ? '#60a5fa' : '#333',
                border: '1px solid ' + (newHoliday.trim() ? '#2563eb44' : '#1a1a1a'),
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 500,
                cursor: newHoliday.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#1e3a5f' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save & Sync to Assistant'}
        </button>

        {status === 'saved' && (
          <span className="text-sm" style={{ color: '#34d399' }}>
            Saved. Jordan now knows your updated schedule.
          </span>
        )}
        {status === 'error' && (
          <span className="text-sm" style={{ color: '#f87171' }}>
            Something went wrong. Try again.
          </span>
        )}
      </div>
    </div>
  )
}
