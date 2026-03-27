'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/dashboard/personality', label: 'Agent Personality', icon: '◉' },
  { href: '/dashboard/knowledge-base', label: 'Knowledge Base', icon: '◎' },
  { href: '/dashboard/calls', label: 'Call Logs', icon: '◷' },
  { href: '/dashboard/appointments', label: 'Business Hours', icon: '◫' },
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
              <span style={{ fontSize: 10, color: active ? '#2563eb' : '#333' }}>{item.icon}</span>
              {item.label}
            </div>
          </Link>
        )
      })}
    </>
  )
}
