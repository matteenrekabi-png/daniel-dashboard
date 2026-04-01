'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Always sign out any existing session when the login page loads
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signOut().catch(() => {})
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const destination = data.user?.email === 'matteenrekabi@superior-ai.org' ? '/admin' : '/dashboard'
    router.push(destination)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#141414' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 12px #2563eb' }} />
            <span className="text-sm font-medium" style={{ color: '#888888' }}>AI Employee</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Sign in</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Access your agent dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#888888' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-all"
              style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', color: '#ededed' }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#888888' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-all"
              style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', color: '#ededed' }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium rounded-lg transition-all duration-150 mt-2"
            style={{ background: loading ? '#1d4ed8' : '#2563eb', color: '#ffffff', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
