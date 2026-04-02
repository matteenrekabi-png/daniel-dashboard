'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  businessName: string
  email: string
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  color: '#ededed',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const cardStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #1a1a1a',
  borderRadius: 12,
}

const btnStyle: React.CSSProperties = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
}

export default function SettingsForm({ businessName, email }: Props) {
  // Support message
  const [message, setMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Change password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send message')
      } else {
        toast.success('Message sent successfully')
        setMessage('')
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message ?? 'Failed to update password')
      } else {
        toast.success('Password updated successfully')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error('Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <style>{`
        .settings-btn:hover:not(:disabled) {
          background: #1d4ed8 !important;
          box-shadow: 0 0 20px rgba(37,99,235,0.45);
          transform: translateY(-1px);
        }
        .settings-btn:active:not(:disabled) { transform: scale(0.97); }
        .settings-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .settings-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
        }
      `}</style>

      {/* Account info — read-only display */}
      <div style={cardStyle} className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Account Info</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: '#444' }}>Business</p>
            <p className="text-sm" style={{ color: '#888' }}>{businessName || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: '#444' }}>Email</p>
            <p className="text-sm" style={{ color: '#888' }}>{email || '—'}</p>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div style={cardStyle} className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Contact Support</p>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>Send a message to the team. We typically respond within 24 hours.</p>
          <p className="text-xs mt-1.5" style={{ color: '#444' }}>
            Prefer email?{' '}
            <a href="mailto:matteenrekabi@superior-ai.org" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              matteenrekabi@superior-ai.org
            </a>
          </p>
        </div>
        <form onSubmit={handleSendMessage} className="px-5 py-4 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question…"
            rows={4}
            required
            className="settings-input"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button
            type="submit"
            disabled={sendingMessage || !message.trim()}
            className="settings-btn"
            style={btnStyle}
          >
            {sendingMessage ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div style={cardStyle} className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Change Password</p>
          <p className="text-xs mt-0.5" style={{ color: '#555' }}>Update your login password.</p>
        </div>
        <form onSubmit={handleChangePassword} className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              className="settings-input"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={8}
              className="settings-input"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="settings-btn"
            style={btnStyle}
          >
            {savingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
