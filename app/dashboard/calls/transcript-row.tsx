'use client'

import { useState } from 'react'

interface Call {
  id: string
  caller_number: string | null
  duration_seconds: number | null
  transcript: string | null
  outcome: string | null
  ai_summary: string | null
  called_at: string | null
}

interface Props {
  call: Call
  formatDate: (ts: string | null) => string
  formatDuration: (s: number | null) => string
}

export default function TranscriptRow({ call, formatDate, formatDuration }: Props) {
  const [expanded, setExpanded] = useState(false)

  const outcomeColor = call.outcome === 'appointment_booked'
    ? { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
    : call.outcome === 'voicemail' || call.outcome === 'no-answer'
    ? { background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d44' }
    : { background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }

  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ borderBottom: '1px solid #1a1a1a' }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#0f0f0f')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <td className="py-3 pr-4 text-xs whitespace-nowrap" style={{ color: '#555' }}>{formatDate(call.called_at)}</td>
        <td className="py-3 pr-4 text-xs font-mono" style={{ color: '#888' }}>{call.caller_number ?? '—'}</td>
        <td className="py-3 pr-4 text-xs" style={{ color: '#888' }}>{formatDuration(call.duration_seconds)}</td>
        <td className="py-3 pr-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={outcomeColor}>
            {call.outcome ?? 'completed'}
          </span>
        </td>
        <td className="py-3 text-xs max-w-xs truncate" style={{ color: '#555' }}>
          {call.ai_summary ?? <span className="italic">No summary</span>}
        </td>
      </tr>
      {expanded && call.transcript && (
        <tr>
          <td colSpan={5} className="pb-4 pt-0">
            <div className="rounded-lg p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#888' }}>
              {call.transcript}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
