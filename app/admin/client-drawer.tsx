'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, Trash2, Plus, UserMinus } from 'lucide-react'

type Client = {
  id: string
  user_id: string
  business_name: string
  email: string
  vapi_assistant_id: string | null
  created_at: string
  is_active: boolean
  admin_notes: string | null
  announcement: string | null
}

type AdditionalUser = {
  id: string
  email: string
  created_at: string
}

const inputStyle = {
  background: '#0a0a0a',
  border: '1px solid #252525',
  color: '#ededed',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const sectionLabel = {
  color: '#444',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}

function SaveButton({ onClick, loading, saved }: { onClick: () => void; loading: boolean; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: saved ? '#064e3b' : '#1e3a5f',
        color: saved ? '#34d399' : '#60a5fa',
        border: `1px solid ${saved ? '#065f4640' : '#2563eb44'}`,
        borderRadius: 7,
        padding: '5px 14px',
        fontSize: 12,
        fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      {loading ? 'Saving…' : saved ? 'Saved' : 'Save'}
    </button>
  )
}

export default function ClientDrawer({
  client,
  adminEmail,
  onClose,
  onUpdated,
  onDeleted,
}: {
  client: Client
  adminEmail: string
  onClose: () => void
  onUpdated: (updated: Partial<Client>) => void
  onDeleted: () => void
}) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-email': adminEmail }

  // Basic info
  const [name, setName] = useState(client.business_name)
  const [email, setEmail] = useState(client.email)
  const [vapiId, setVapiId] = useState(client.vapi_assistant_id ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [savedInfo, setSavedInfo] = useState(false)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [savedPw, setSavedPw] = useState(false)

  // Additional users
  const [users, setUsers] = useState<AdditionalUser[]>([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [addingUser, setAddingUser] = useState(false)

  // Admin notes
  const [notes, setNotes] = useState(client.admin_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedNotes, setSavedNotes] = useState(false)

  // Announcement
  const [announcement, setAnnouncement] = useState(client.announcement ?? '')
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [savedAnnouncement, setSavedAnnouncement] = useState(false)

  // Active toggle
  const [isActive, setIsActive] = useState(client.is_active)
  const [savingActive, setSavingActive] = useState(false)

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`/api/admin/clients/${client.id}/users`, {
      headers: { 'x-admin-email': adminEmail },
    })
    if (res.ok) setUsers(await res.json())
  }, [client.id, adminEmail])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function saveInfo() {
    setSavingInfo(true)
    await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ business_name: name, email, vapi_assistant_id: vapiId || null }),
    })
    setSavingInfo(false)
    setSavedInfo(true)
    onUpdated({ business_name: name, email, vapi_assistant_id: vapiId || null })
    setTimeout(() => setSavedInfo(false), 2500)
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 8) return
    setSavingPw(true)
    await fetch(`/api/admin/clients/${client.id}/password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ newPassword }),
    })
    setSavingPw(false)
    setSavedPw(true)
    setNewPassword('')
    setTimeout(() => setSavedPw(false), 2500)
  }

  async function addUser() {
    if (!newUserEmail || !newUserPassword) return
    setAddingUser(true)
    const res = await fetch(`/api/admin/clients/${client.id}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword }),
    })
    if (res.ok) {
      setNewUserEmail('')
      setNewUserPassword('')
      fetchUsers()
    }
    setAddingUser(false)
  }

  async function removeUser(rowId: string) {
    await fetch(`/api/admin/clients/${client.id}/users`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ rowId }),
    })
    fetchUsers()
  }

  async function saveNotes() {
    setSavingNotes(true)
    await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ admin_notes: notes }),
    })
    setSavingNotes(false)
    setSavedNotes(true)
    onUpdated({ admin_notes: notes })
    setTimeout(() => setSavedNotes(false), 2500)
  }

  async function toggleActive() {
    const next = !isActive
    setSavingActive(true)
    setIsActive(next)
    await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_active: next }),
    })
    setSavingActive(false)
    onUpdated({ is_active: next })
  }

  async function pushAnnouncement() {
    setSavingAnnouncement(true)
    await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ announcement: announcement || null }),
    })
    setSavingAnnouncement(false)
    setSavedAnnouncement(true)
    onUpdated({ announcement: announcement || null })
    setTimeout(() => setSavedAnnouncement(false), 2500)
  }

  async function deleteClient() {
    setDeleting(true)
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) onDeleted()
    else setDeleting(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 overflow-y-auto"
        style={{ width: 480, background: '#0a0a0a', borderLeft: '1px solid #1a1a1a' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4"
          style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', zIndex: 10 }}
        >
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: '#ededed' }}>{client.business_name}</p>
            <p className="text-xs" style={{ color: '#555' }}>{client.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <a
              href={`/admin/view/${client.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }}
            >
              <ExternalLink size={12} />
              View Dashboard
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#555' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <p style={sectionLabel}>Basic Info</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: '#555' }}>Business Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                  onBlur={(e) => (e.target.style.borderColor = '#252525')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: '#555' }}>Login Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                  onBlur={(e) => (e.target.style.borderColor = '#252525')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: '#555' }}>VAPI Assistant ID</label>
                <input
                  value={vapiId}
                  onChange={(e) => setVapiId(e.target.value)}
                  placeholder="Leave blank if not connected"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                  onBlur={(e) => (e.target.style.borderColor = '#252525')}
                />
              </div>
              <div className="flex justify-end">
                <SaveButton onClick={saveInfo} loading={savingInfo} saved={savedInfo} />
              </div>
            </div>
          </section>

          <div style={{ borderTop: '1px solid #1a1a1a' }} />

          {/* Reset Password */}
          <section className="space-y-4">
            <p style={sectionLabel}>Reset Password</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ ...inputStyle }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#252525')}
              />
              <SaveButton onClick={resetPassword} loading={savingPw} saved={savedPw} />
            </div>
          </section>

          <div style={{ borderTop: '1px solid #1a1a1a' }} />

          {/* Additional Users */}
          <section className="space-y-4">
            <p style={sectionLabel}>Additional Users</p>
            <p className="text-xs" style={{ color: '#444' }}>Extra logins that access this same dashboard.</p>

            {users.length > 0 && (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                    style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
                  >
                    <span className="text-sm truncate" style={{ color: '#aaa' }}>{u.email}</span>
                    <button
                      onClick={() => removeUser(u.id)}
                      className="shrink-0"
                      style={{ color: '#555' }}
                      title="Remove user"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <input
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#252525')}
              />
              <input
                type="password"
                placeholder="Temporary password (min 8 chars)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#252525')}
              />
              <button
                onClick={addUser}
                disabled={addingUser || !newUserEmail || !newUserPassword}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: '#141414',
                  border: '1px solid #252525',
                  color: '#888',
                  cursor: addingUser || !newUserEmail || !newUserPassword ? 'not-allowed' : 'pointer',
                  opacity: addingUser || !newUserEmail || !newUserPassword ? 0.5 : 1,
                }}
              >
                <Plus size={12} />
                {addingUser ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </section>

          <div style={{ borderTop: '1px solid #1a1a1a' }} />

          {/* Agent Status */}
          <section className="space-y-4">
            <p style={sectionLabel}>Agent Status</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: '#ededed' }}>Agent Active</p>
                <p className="text-xs mt-0.5" style={{ color: '#444' }}>Disable to pause the client's dashboard access</p>
              </div>
              <button
                onClick={toggleActive}
                disabled={savingActive}
                className="relative inline-flex items-center rounded-full transition-colors duration-200"
                style={{
                  width: 44,
                  height: 24,
                  background: isActive ? '#2563eb' : '#252525',
                  flexShrink: 0,
                }}
              >
                <span
                  className="inline-block rounded-full transition-transform duration-200"
                  style={{
                    width: 18,
                    height: 18,
                    background: '#fff',
                    transform: isActive ? 'translateX(22px)' : 'translateX(3px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }}
                />
              </button>
            </div>
          </section>

          <div style={{ borderTop: '1px solid #1a1a1a' }} />

          {/* Admin Notes */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p style={sectionLabel}>Admin Notes</p>
              <span className="text-xs" style={{ color: '#333' }}>Private — client never sees this</span>
            </div>
            <textarea
              rows={4}
              placeholder="Internal notes about this client, their setup, preferences, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#252525')}
            />
            <div className="flex justify-end">
              <SaveButton onClick={saveNotes} loading={savingNotes} saved={savedNotes} />
            </div>
          </section>

          <div style={{ borderTop: '1px solid #1a1a1a' }} />

          {/* Announcement */}
          <section className="space-y-4">
            <p style={sectionLabel}>Dashboard Announcement</p>
            <p className="text-xs" style={{ color: '#444' }}>
              Shows as a banner at the top of the client's dashboard. Clear the field and push to remove it.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Your agent is being updated — calls resume Monday."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#252525')}
            />
            <div className="flex justify-end">
              <SaveButton onClick={pushAnnouncement} loading={savingAnnouncement} saved={savedAnnouncement} />
            </div>
          </section>

          <div style={{ borderTop: '1px solid #1a1a1a' }} />

          {/* Danger Zone */}
          <section className="space-y-4">
            <p style={{ ...sectionLabel, color: '#7f1d1d' }}>Danger Zone</p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#1a0505', border: '1px solid #7f1d1d44', color: '#ef4444' }}
              >
                <Trash2 size={14} />
                Delete Account
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg" style={{ background: '#1a0505', border: '1px solid #7f1d1d44' }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>
                  This will permanently delete the auth account, client record, and all associated data. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={deleteClient}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: '#7f1d1d', color: '#fca5a5', cursor: deleting ? 'not-allowed' : 'pointer' }}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ background: '#141414', border: '1px solid #252525', color: '#666' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Bottom padding */}
          <div style={{ height: 32 }} />
        </div>
      </div>
    </>
  )
}
