import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import LogoutButton from '@/components/logout-button'
import DashboardNav from '@/components/dashboard-nav'
import AnnouncementBanner from '@/components/announcement-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#141414' }}>
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
          {children}
        </main>
      </div>
    </div>
  )
}
