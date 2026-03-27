export default function PersonalityLoading() {
  return (
    <div className="space-y-8 max-w-2xl" style={{ animation: 'pageFadeIn 0.15s ease both' }}>
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg" style={{ background: '#1a1a1a', animation: 'shimmer 1.4s ease infinite' }} />
        <div className="h-4 w-72 rounded" style={{ background: '#141414', animation: 'shimmer 1.4s ease infinite', animationDelay: '0.05s' }} />
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded" style={{ background: '#1a1a1a', animation: 'shimmer 1.4s ease infinite' }} />
          <div className="h-10 w-full rounded-lg" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', animation: 'shimmer 1.4s ease infinite', animationDelay: '0.05s' }} />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-32 rounded" style={{ background: '#1a1a1a', animation: 'shimmer 1.4s ease infinite' }} />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 rounded-xl" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', animation: 'shimmer 1.4s ease infinite', animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-28 rounded" style={{ background: '#1a1a1a', animation: 'shimmer 1.4s ease infinite' }} />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 rounded-xl" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', animation: 'shimmer 1.4s ease infinite', animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
        <div className="h-10 w-44 rounded-lg" style={{ background: '#1e3a5f', animation: 'shimmer 1.4s ease infinite', animationDelay: '0.15s' }} />
      </div>
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
