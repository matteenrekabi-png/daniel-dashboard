'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function AnnouncementBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className="flex items-center justify-between gap-4 px-6 py-3"
      style={{
        background: '#1e2a0a',
        borderBottom: '1px solid #365314',
      }}
    >
      <p className="text-sm" style={{ color: '#bef264' }}>{message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0"
        style={{ color: '#4d7c0f' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
