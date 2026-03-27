export default function SettingsLoading() {
  const shimmer = {
    background: 'linear-gradient(90deg, #141414 25%, #1f1f1f 50%, #141414 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s ease infinite',
  }

  return (
    <div className="space-y-6 max-w-xl" style={{ animation: 'pageFadeIn 0.15s ease both' }}>
      <div className="space-y-2">
        <div className="h-7 w-28 rounded-lg" style={shimmer} />
        <div className="h-4 w-56 rounded" style={{ ...shimmer, animationDelay: '0.05s' }} />
      </div>

      {/* Account info card skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <div className="h-4 w-28 rounded" style={shimmer} />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="h-3 w-20 rounded" style={{ ...shimmer, animationDelay: '0.06s' }} />
          <div className="h-3 w-40 rounded" style={{ ...shimmer, animationDelay: '0.1s' }} />
        </div>
      </div>

      {/* Contact support card skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <div className="h-4 w-36 rounded" style={{ ...shimmer, animationDelay: '0.07s' }} />
          <div className="h-3 w-64 rounded mt-1.5" style={{ ...shimmer, animationDelay: '0.1s' }} />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="h-24 w-full rounded-lg" style={{ ...shimmer, animationDelay: '0.12s' }} />
          <div className="h-9 w-32 rounded-lg" style={{ ...shimmer, animationDelay: '0.15s' }} />
        </div>
      </div>

      {/* Change password card skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <div className="h-4 w-36 rounded" style={{ ...shimmer, animationDelay: '0.08s' }} />
          <div className="h-3 w-48 rounded mt-1.5" style={{ ...shimmer, animationDelay: '0.12s' }} />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="h-10 w-full rounded-lg" style={{ ...shimmer, animationDelay: '0.14s' }} />
          <div className="h-10 w-full rounded-lg" style={{ ...shimmer, animationDelay: '0.17s' }} />
          <div className="h-9 w-36 rounded-lg" style={{ ...shimmer, animationDelay: '0.2s' }} />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
