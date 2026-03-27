'use client'

import { usePathname } from 'next/navigation'

/**
 * Wraps page content with a fade+slide animation on every route change.
 * Uses key={pathname} so React remounts the div on navigation, restarting the animation.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div
      key={pathname}
      style={{ animation: 'pageFadeIn 0.2s ease both' }}
    >
      {children}
    </div>
  )
}
