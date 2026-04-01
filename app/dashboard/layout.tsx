import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import LogoutButton from '@/components/logout-button'
import DashboardNav from '@/components/dashboard-nav'
import AnnouncementBanner from '@/components/announcement-banner'
import PageTransition from '@/components/page-transition'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === ADMIN_EMAIL
  const cookieStore = await cookies()
  const viewingClientId = cookieStore.get('admin_view_client_id')?.value

  // Admin with no view cookie has nothing to show — send back to admin panel
  if (isAdmin && !viewingClientId) redirect('/admin')

  const client = await getClientByUserId(user.id)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#141414' }}>
      {/* Admin view banner */}
      {isAdmin && client && (
        <div style={{ background: '#1e3a5f', borderBottom: '1px solid #2563eb44', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />
            <span style={{ color: '#93c5fd', fontSize: 13, fontWeight: 500 }}>
              Viewing as admin — {client.business_name}
            </span>
          </div>
          <a
            href="/api/admin/clear-view"
            style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none', border: '1px solid #2563eb44', borderRadius: 6, padding: '4px 10px' }}
          >
            ← Back to Admin
          </a>
        </div>
      )}

      {/* Announcement banner */}
      {client?.announcement && (
        <AnnouncementBanner message={client.announcement} />
      )}

      {/* Top header */}
      <header style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }} className="px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#ededed' }}>{client?.business_name ?? 'Dashboard'}</p>
            <p className="text-xs" style={{ color: '#555' }}>AI Employee</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside style={{ width: 220, background: '#0a0a0a', borderRight: '1px solid #1a1a1a' }} className="p-4 flex flex-col gap-1 shrink-0">
          <DashboardNav />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 overflow-auto" style={{ background: '#141414' }}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
