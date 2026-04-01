'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Check, ChevronDown, ChevronUp, X } from 'lucide-react'
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
  before_snapshot: string | null
  after_snapshot: string | null
  change_type: string | null
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

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      title={`Copy ${label ?? text}`}
      style={{
        background: copied ? '#052e16' : 'transparent',
        border: `1px solid ${copied ? '#16a34a44' : '#2a2a2a'}`,
        borderRadius: 5,
        padding: '2px 6px',
        cursor: 'pointer',
        color: copied ? '#4ade80' : '#444',
        fontSize: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function DiffModal({ entry, onClose }: { entry: ActivityEntry; onClose: () => void }) {
  const before = entry.before_snapshot ?? ''
  const after = entry.after_snapshot ?? ''

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'adminFadeIn 0.18s ease both',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f0f0f',
          border: '1px solid #222',
          borderRadius: 16,
          width: '100%',
          maxWidth: 880,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ color: '#ededed', fontWeight: 600, fontSize: 14, margin: 0 }}>{entry.action}</p>
            <p style={{ color: '#444', fontSize: 12, margin: '2px 0 0' }}>
              {entry.client_name} · {timeAgo(entry.created_at)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Diff body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Before */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a1a1a', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #1a1a1a', background: '#1a0808', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Before</span>
            </div>
            <textarea
              readOnly
              value={before}
              style={{
                flex: 1, resize: 'none', background: '#0a0505', color: '#cc8888',
                border: 'none', padding: '12px 14px', fontFamily: 'monospace',
                fontSize: 11, lineHeight: 1.6, outline: 'none', overflow: 'auto',
              }}
            />
          </div>

          {/* After */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #1a1a1a', background: '#051a0d', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em' }}>After</span>
            </div>
            <textarea
              readOnly
              value={after}
              style={{
                flex: 1, resize: 'none', background: '#020d05', color: '#86efac',
                border: 'none', padding: '12px 14px', fontFamily: 'monospace',
                fontSize: 11, lineHeight: 1.6, outline: 'none', overflow: 'auto',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [diffEntry, setDiffEntry] = useState<ActivityEntry | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Create form
  const [showCreate, setShowCreate] = useState(false)
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
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) { router.push('/login'); return }
        const { user } = await res.json()
        if (!user) { router.push('/login'); return }
        if (user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }
        setAdminEmail(user.email)
        setAuthorized(true)
        fetchClients(user.email)
        fetchActivity(user.email)
      } catch {
        router.push('/login')
      }
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
    setShowCreate(false)
    fetchClients(adminEmail)
    fetchActivity(adminEmail)
    setCreating(false)
  }

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb', animation: 'adminFadeIn 0.5s ease infinite alternate' }} />
    </div>
  )

  const card: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12 }

  // Filtered clients
  const filtered = clients.filter(c => {
    const matchesSearch = !search || c.business_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.is_active : !c.is_active)
    return matchesSearch && matchesStatus
  })

  const totalActive = clients.filter(c => c.is_active).length
  const totalWithAgent = clients.filter(c => c.vapi_assistant_id).length

  return (
    <div className="min-h-screen p-6" style={{ background: '#050505' }}>
      <style>{`
        @keyframes adminFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes adminBadgePop {
          0%   { opacity: 0; transform: scale(0.82); }
          60%  { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        .admin-client-row {
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
          cursor: pointer;
        }
        .admin-client-row:hover {
          background: rgba(255,255,255,0.025) !important;
          box-shadow: 0 3px 16px rgba(0,0,0,0.25);
          transform: translateY(-1px);
        }
        .admin-activity-row { transition: background 0.12s ease; }
        .admin-activity-row:hover { background: rgba(255,255,255,0.02); }
        .admin-filter-btn { transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
        .admin-create-btn { transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease !important; }
        .admin-create-btn:hover:not(:disabled) { background: #1d4ed8 !important; box-shadow: 0 0 20px rgba(37,99,235,0.4); transform: translateY(-1px); }
        .admin-create-btn:active:not(:disabled) { transform: scale(0.97); }
        .admin-input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }
        .diff-link { transition: color 0.12s ease; }
        .diff-link:hover { color: #93c5fd !important; }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between" style={{ animation: 'adminFadeIn 0.22s ease both' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb' }} />
            <div>
              <h1 className="text-xl font-semibold" style={{ color: '#ededed' }}>Admin Panel</h1>
              <p className="text-xs" style={{ color: '#444' }}>Platform owner access</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="admin-create-btn px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5"
            style={{ background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {showCreate ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            New Client
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3" style={{ animation: 'adminFadeIn 0.24s ease both', animationDelay: '0.04s' }}>
          {[
            { label: 'Total Clients', value: clients.length, color: '#60a5fa' },
            { label: 'Active', value: totalActive, color: '#4ade80' },
            { label: 'With Agent', value: totalWithAgent, color: '#a78bfa' },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 rounded-xl" style={card}>
              <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: '#444' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Create Client — collapsible */}
        {showCreate && (
          <div style={{ ...card, animation: 'adminFadeIn 0.22s ease both' }} className="overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #1a1a1a' }}>
              <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Create New Client</p>
            </div>
            <div className="p-5">
              <form onSubmit={handleCreate}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Business Name', placeholder: 'Peak Home Services', value: businessName, onChange: setBusinessName, required: true },
                    { label: 'Client Email', placeholder: 'client@example.com', value: email, onChange: setEmail, required: true, type: 'email' },
                    { label: 'Temporary Password', placeholder: 'Min. 8 characters', value: password, onChange: setPassword, required: true, type: 'password' },
                    { label: 'VAPI Assistant ID (optional)', placeholder: 'c6e90e5a-…', value: vapiAssistantId, onChange: setVapiAssistantId, required: false },
                  ].map(({ label, placeholder, value, onChange, required, type }) => (
                    <div key={label} className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>{label}</label>
                      <input
                        type={type ?? 'text'}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        required={required}
                        minLength={label.includes('Password') ? 8 : undefined}
                        className="admin-input"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                        onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="admin-create-btn px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ background: '#2563eb', color: '#fff', opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer', border: 'none' }}
                >
                  {creating ? 'Creating…' : 'Create Client Account'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Main grid: client list + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ animation: 'adminFadeIn 0.26s ease both', animationDelay: '0.08s' }}>

          {/* Client list — 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            {/* Search + filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input"
                style={{ ...inputStyle, width: 'auto', flex: '1 1 160px', fontSize: 12, padding: '6px 10px' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
              />
              <div className="flex items-center gap-1">
                {(['all', 'active', 'inactive'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className="admin-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                    style={{
                      background: statusFilter === f ? '#1e3a5f' : '#0f0f0f',
                      color: statusFilter === f ? '#60a5fa' : '#555',
                      border: `1px solid ${statusFilter === f ? '#2563eb44' : '#1a1a1a'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44' }}>
                {filtered.length}
              </span>
            </div>

            {/* Rows */}
            {loadingClients ? (
              <p className="text-sm" style={{ color: '#444' }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm" style={{ color: '#444' }}>No clients found.</p>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className="w-full text-left admin-client-row"
                    style={{ ...card, display: 'block', animation: 'adminFadeIn 0.24s ease both', animationDelay: `${0.04 * idx}s` }}
                  >
                    <div className="px-4 py-3 flex items-center gap-3 rounded-xl">
                      {/* Status dot */}
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.is_active ? '#4ade80' : '#444', flexShrink: 0, boxShadow: c.is_active ? '0 0 6px #4ade8066' : 'none' }} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm" style={{ color: '#ededed' }}>{c.business_name}</p>
                          {!c.is_active && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1a1a1a', color: '#555', border: '1px solid #252525' }}>Inactive</span>
                          )}
                          {c.announcement && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1e2a0a', color: '#84cc16', border: '1px solid #365314' }}>Announcement</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs truncate" style={{ color: '#555' }}>{c.email}</p>
                          <CopyBtn text={c.email} label="email" />
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono truncate max-w-xs" style={{ color: '#333' }}>
                            {c.vapi_assistant_id ?? 'No assistant ID'}
                          </p>
                          {c.vapi_assistant_id && <CopyBtn text={c.vapi_assistant_id} label="VAPI ID" />}
                        </div>
                      </div>

                      {/* Right: badge + date */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={c.vapi_assistant_id
                            ? { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb44', animation: 'adminBadgePop 0.3s ease both', animationDelay: `${0.08 + 0.04 * idx}s` }
                            : { background: '#1a1a1a', color: '#555', border: '1px solid #2a2a2a' }
                          }
                        >
                          {c.vapi_assistant_id ? 'Connected' : 'No agent'}
                        </span>
                        <p className="text-xs" style={{ color: '#333' }}>{fmtDate(c.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed — 1/3 */}
          <div className="space-y-3">
            <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Recent Activity</p>
            <div style={card} className="overflow-hidden">
              {activity.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm" style={{ color: '#333' }}>No activity yet.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#1a1a1a' }}>
                  {activity.map((entry, idx) => (
                    <div key={entry.id} className="px-4 py-3 admin-activity-row" style={{ animationDelay: `${0.03 * idx}s` }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug" style={{ color: '#ccc' }}>{entry.action}</p>
                        <span className="text-xs shrink-0" style={{ color: '#444' }}>{timeAgo(entry.created_at)}</span>
                      </div>
                      {entry.client_name && (
                        <p className="text-xs mt-0.5" style={{ color: '#555' }}>{entry.client_name}</p>
                      )}
                      {entry.details && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#333' }}>{entry.details}</p>
                      )}
                      {entry.before_snapshot && entry.after_snapshot && (
                        <button
                          onClick={() => setDiffEntry(entry)}
                          className="diff-link mt-1 text-xs font-medium"
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}
                        >
                          View diff →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div style={{ ...card, animation: 'adminFadeIn 0.28s ease both', animationDelay: '0.12s' }} className="overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Settings</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              { label: 'Admin Email', value: ADMIN_EMAIL },
              { label: 'Dashboard URL', value: 'https://aireceptionist-dashboard-production.up.railway.app' },
              { label: 'VAPI Webhook URL', value: 'https://aireceptionist-dashboard-production.up.railway.app/api/vapi/webhook' },
              { label: 'n8n Webhook Base', value: 'https://matteen.app.n8n.cloud/webhook' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="uppercase tracking-wider font-medium mb-1" style={{ color: '#444' }}>{label}</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono truncate" style={{ color: '#666' }}>{value}</p>
                  <CopyBtn text={value} label={label} />
                </div>
              </div>
            ))}
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

      {/* Diff Modal */}
      {diffEntry && <DiffModal entry={diffEntry} onClose={() => setDiffEntry(null)} />}
    </div>
  )
}
