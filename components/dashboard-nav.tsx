'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, BookOpen, Phone, CalendarDays } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/personality', label: 'Agent Personality', Icon: Bot },
  { href: '/dashboard/knowledge-base', label: 'Knowledge Base', Icon: BookOpen },
  { href: '/dashboard/calls', label: 'Call Logs', Icon: Phone },
  { href: '/dashboard/appointments', label: 'Appointments', Icon: CalendarDays },
]

export default function DashboardNav() {
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
              {item.label}
            </div>
          </Link>
        )
      })}
    </>
  )
}
