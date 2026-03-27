'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

type Call = {
  id: string
  caller_number: string | null
  duration_seconds: number | null
  transcript: string | null
  outcome: string | null
  ai_summary: string | null
  called_at: string | null
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function formatDate(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const outcomeStyle = (outcome: string | null) => {
  if (outcome === 'appointment-booked' || outcome === 'appointment_booked')
    return { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
  if (outcome === 'voicemail' || outcome === 'no-answer')
    return { background: '#2a1a1a', color: '#f87171', border: '1px solid #7f1d1d44' }
  return { background: '#1a1a1a', color: '#888888', border: '1px solid #2a2a2a' }
}

function CallRow({ call, onDelete }: { call: Call; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const res = await fetch(`/api/calls/${call.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(call.id)
    else setDeleting(false)
  }

  return (
    <>
      <tr
        className="cursor-pointer"
        style={{ borderBottom: '1px solid #1a1a1a' }}
        onClick={() => { setExpanded(!expanded); setConfirmDelete(false) }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#111')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <td className="py-3 pr-4 text-xs whitespace-nowrap" style={{ color: '#555' }}>{formatDate(call.called_at)}</td>
        <td className="py-3 pr-4 text-xs font-mono" style={{ color: '#888' }}>{call.caller_number ?? '—'}</td>
        <td className="py-3 pr-4 text-xs" style={{ color: '#888' }}>{formatDuration(call.duration_seconds)}</td>
        <td className="py-3 pr-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={outcomeStyle(call.outcome)}>
            {call.outcome ?? 'completed'}
          </span>
        </td>
        <td className="py-3 text-xs max-w-xs truncate" style={{ color: '#555' }}>
          {call.ai_summary ?? <span className="italic">No summary</span>}
        </td>
        <td className="py-3 pl-4 text-right" onClick={(e) => e.stopPropagation()}>
          {confirmDelete ? (
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs" style={{ color: '#f87171' }}>Remove?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2 py-1 rounded"
                style={{ background: '#7f1d1d', color: '#fca5a5' }}
              >
                {deleting ? '…' : 'Yes'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                className="text-xs px-2 py-1 rounded"
                style={{ background: '#1a1a1a', color: '#666' }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
              style={{ color: '#444' }}
              title="Remove from log"
            >
              <Trash2 size={13} />
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="pb-4 pt-0">
            <div className="rounded-lg p-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#666', fontFamily: 'inherit' }}>
              {call.transcript ?? <span className="italic">No transcript available</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function CallsClient({ calls: initial }: { calls: Call[] }) {
  const [calls, setCalls] = useState(initial)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Call Logs</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Every call your AI employee has handled. Click a row to read the transcript.
        </p>
      </div>

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }} className="overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <span className="text-sm font-medium" style={{ color: '#888' }}>{calls.length} calls</span>
        </div>
        <div className="px-6">
          {!calls.length ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm" style={{ color: '#555' }}>No calls yet.</p>
              <p className="text-xs" style={{ color: '#333' }}>Calls will appear here once your agent goes live.</p>
            </div>
          ) : (
            <table className="w-full text-sm group">
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Date</th>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Caller</th>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Duration</th>
                  <th className="text-left py-3 pr-4 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Outcome</th>
                  <th className="text-left py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#444' }}>Summary</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <CallRow key={call.id} call={call} onDelete={(id) => setCalls(prev => prev.filter(c => c.id !== id))} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
