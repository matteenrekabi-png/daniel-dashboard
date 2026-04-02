'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, BookOpen, Phone, CalendarDays, BarChart2, MessageSquare, Settings } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/personality', label: 'Agent Personality', Icon: Bot },
  { href: '/dashboard/knowledge-base', label: 'Knowledge Base', Icon: BookOpen },
  { href: '/dashboard/calls', label: 'Call Logs', Icon: Phone },
  { href: '/dashboard/appointments', label: 'Appointments', Icon: CalendarDays },
  { href: '/dashboard/metrics', label: 'Metrics', Icon: BarChart2 },
  { href: '/dashboard/messages', label: 'Messages', Icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

export default function DashboardNav({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname()

  return (
    <>
      {nav.map((item) => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href}>
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                background: active ? '#1e3a5f' : 'transparent',
                color: active ? '#60a5fa' : '#888888',
                borderLeft: active ? '2px solid #2563eb' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.background = '#1a1a1a'
                  ;(e.currentTarget as HTMLElement).style.color = '#ededed'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#888888'
                }
              }}
            >
              <item.Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.5 }} />
              <span className="flex-1">{item.label}</span>
              {item.href === '/dashboard/messages' && unreadMessages > 0 && (
                <span style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  {unreadMessages}
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </>
  )
}
