'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ClientDrawer from './client-drawer'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

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

type ActivityEntry = {
  id: string
  created_at: string
  action: string
  client_name: string | null
  details: string | null
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

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Create form
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vapiAssistantId, setVapiAssistantId] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchClients = useCallback(async (ae: string) => {
    const res = await fetch('/api/admin/clients', { headers: { 'x-admin-email': ae } })
    if (res.ok) setClients(await res.json())
    setLoadingClients(false)
  }, [])

  const fetchActivity = useCallback(async (ae: string) => {
    const res = await fetch('/api/admin/activity', { headers: { 'x-admin-email': ae } })
    if (res.ok) setActivity(await res.json())
  }, [])

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }
      setAdminEmail(user.email)
      setAuthorized(true)
      fetchClients(user.email)
      fetchActivity(user.email)
    }
    checkAuth()
  }, [router, fetchClients, fetchActivity])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ businessName, email, password, vapiAssistantId }),
    })
    const body = await res.json()
    if (!res.ok) { toast.error(body.error || 'Failed to create client'); setCreating(false); return }
    toast.success(`Account created for ${businessName}`)
    setBusinessName(''); setEmail(''); setPassword(''); setVapiAssistantId('')
    fetchClients(adminEmail)
    fetchActivity(adminEmail)
    setCreating(false)
  }

  if (!authorized) return null

  const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  return (
    <div className="min-h-screen p-8" style={{ background: '#050505' }}>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb' }} />
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Admin Panel</h1>
            <p className="text-xs mt-0.5" style={{ color: '#444' }}>Platform owner access</p>
          </div>
        </div>

        {/* Create Client */}
        <div style={card} className="overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Create New Client</p>
            <p className="text-xs mt-0.5" style={{ color: '#555' }}>Creates a login account and links it to their VAPI agent.</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Business Name</label>
                  <input
                    placeholder="Peak Home Services"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Client Email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Temporary Password</label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>VAPI Assistant ID <span style={{ color: '#333', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    placeholder="c6e90e5a-7b44-49d9-…"
                    value={vapiAssistantId}
                    onChange={(e) => setVapiAssistantId(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 text-sm font-medium rounded-lg"
                style={{ background: creating ? '#1d4ed8' : '#2563eb', color: '#fff', opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Creating…' : 'Create Client Account'}
              </button>
            </form>
          </div>
        </div>

        {/* Two-column layout: client list + activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Client List — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: '#ededed' }}>All Clients</p>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }}>
                {clients.length} total
              </span>
            </div>

            {loadingClients ? (
              <p className="text-sm" style={{ color: '#444' }}>Loading…</p>
            ) : clients.length === 0 ? (
              <p className="text-sm" style={{ color: '#444' }}>No clients yet.</p>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className="w-full text-left"
                    style={{ ...card, display: 'block' }}
                  >
                    <div className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors rounded-xl">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm" style={{ color: '#ededed' }}>{c.business_name}</p>
                          {!c.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#1a1a1a', color: '#555', border: '1px solid #252525' }}>
                              Inactive
                            </span>
                          )}
                          {c.announcement && (
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#1e2a0a', color: '#84cc16', border: '1px solid #365314' }}>
                              Announcement
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#555' }}>{c.email}</p>
                        <p className="text-xs font-mono truncate max-w-xs" style={{ color: '#333' }}>
                          {c.vapi_assistant_id ?? 'No assistant ID'}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                        style={c.vapi_assistant_id
                          ? { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }
                          : { background: '#1a1a1a', color: '#555', border: '1px solid #2a2a2a' }
                        }
                      >
                        {c.vapi_assistant_id ? 'Connected' : 'No agent'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed — 1/3 width */}
          <div className="space-y-4">
            <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Recent Activity</p>
            <div style={card} className="overflow-hidden">
              {activity.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm" style={{ color: '#333' }}>No activity yet.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#1a1a1a' }}>
                  {activity.map((entry) => (
                    <div key={entry.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium" style={{ color: '#ccc' }}>{entry.action}</p>
                        <span className="text-xs shrink-0" style={{ color: '#444' }}>{timeAgo(entry.created_at)}</span>
                      </div>
                      {entry.client_name && (
                        <p className="text-xs mt-0.5" style={{ color: '#555' }}>{entry.client_name}</p>
                      )}
                      {entry.details && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#333' }}>{entry.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Client Drawer */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          adminEmail={adminEmail}
          onClose={() => setSelectedClient(null)}
          onUpdated={(updates) => {
            setClients((prev) => prev.map((c) => c.id === selectedClient.id ? { ...c, ...updates } : c))
            setSelectedClient((prev) => prev ? { ...prev, ...updates } : null)
            fetchActivity(adminEmail)
          }}
          onDeleted={() => {
            setClients((prev) => prev.filter((c) => c.id !== selectedClient.id))
            setSelectedClient(null)
            fetchActivity(adminEmail)
            toast.success('Client deleted')
          }}
        />
      )}
    </div>
  )
}
