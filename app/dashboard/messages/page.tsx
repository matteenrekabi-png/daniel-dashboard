'use client'

import { useEffect, useState } from 'react'

type Message = {
  id: string
  message: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string | null
  client_viewed: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; desc: string }> = {
  pending:          { label: 'Pending',       color: '#888',    bg: '#1a1a1a',    border: '#2a2a2a',    desc: "Your message has been sent and is waiting to be reviewed." },
  in_progress:      { label: 'In Progress',   color: '#60a5fa', bg: '#1e3a5f',    border: '#2563eb44',  desc: "We've seen this and are working on it." },
  fixed:            { label: 'Fixed',         color: '#4ade80', bg: '#0f2a1a',    border: '#16a34a44',  desc: "This has been resolved." },
  emailed:          { label: 'Emailed',       color: '#a78bfa', bg: '#1e1a3a',    border: '#7c3aed44',  desc: "We sent you an email — check your inbox." },
  no_action_needed: { label: 'No Action',     color: '#fbbf24', bg: '#2a1f0a',    border: '#78350f44',  desc: "No action was needed for this one." },
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

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client/messages')
      .then(r => r.json())
      .then(data => { setMessages(data); setLoading(false) })
      .catch(() => setLoading(false))

    // Mark all as viewed
    fetch('/api/client/messages', { method: 'POST' })
  }, [])

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-card { transition: border-color 0.2s ease; }
        .msg-card:hover { border-color: #222 !important; }
      `}</style>

      <div className="space-y-6 max-w-2xl">
        <div style={{ animation: 'fadeUp 0.2s ease both' }}>
          <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Messages</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Support requests you've sent and their current status.</p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#444' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={card}>
            <p className="text-sm" style={{ color: '#555' }}>No messages yet.</p>
            <p className="text-xs mt-1" style={{ color: '#333' }}>Messages you send from Settings will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const cfg = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.pending
              const isNew = !msg.client_viewed && msg.status !== 'pending'
              return (
                <div
                  key={msg.id}
                  className="msg-card p-5"
                  style={{ ...card, animation: `fadeUp 0.25s ease both`, animationDelay: `${0.05 * i}s`, borderColor: isNew ? '#2563eb44' : '#1a1a1a' }}
                >
                  {/* Status row */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {isNew && (
                        <span className="text-xs font-medium" style={{ color: '#60a5fa' }}>Updated</span>
                      )}
                      <span className="text-xs" style={{ color: '#444' }}>{timeAgo(msg.created_at)}</span>
                    </div>
                  </div>

                  {/* Status description */}
                  <p className="text-xs mb-3" style={{ color: '#555' }}>{cfg.desc}</p>

                  {/* Original message */}
                  <div className="rounded-lg p-3 mb-3" style={{ background: '#0a0a0a', border: '1px solid #141414' }}>
                    <p className="text-xs uppercase tracking-wider font-medium mb-1.5" style={{ color: '#333' }}>Your message</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                  </div>

                  {/* Admin note if present */}
                  {msg.admin_note && (
                    <div className="rounded-lg p-3" style={{ background: '#1e3a5f11', border: '1px solid #2563eb22' }}>
                      <p className="text-xs uppercase tracking-wider font-medium mb-1.5" style={{ color: '#2563eb88' }}>Note from support</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#93c5fd', whiteSpace: 'pre-wrap' }}>{msg.admin_note}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
