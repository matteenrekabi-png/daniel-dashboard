export default function CallsLoading() {
  return (
    <div className="space-y-6" style={{ animation: 'pageFadeIn 0.15s ease both' }}>
      <div className="space-y-2">
        <div className="h-7 w-28 rounded-lg" style={{ background: '#1a1a1a', animation: 'shimmer 1.4s ease infinite' }} />
        <div className="h-4 w-48 rounded" style={{ background: '#141414', animation: 'shimmer 1.4s ease infinite', animationDelay: '0.05s' }} />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #141414' }}>
          <div className="h-4 w-32 rounded" style={{ background: '#1a1a1a', animation: 'shimmer 1.4s ease infinite' }} />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: i < 7 ? '1px solid #0f0f0f' : 'none' }}>
            <div className="h-3 w-28 rounded" style={{ background: '#141414', animation: 'shimmer 1.4s ease infinite', animationDelay: `${i * 0.04}s` }} />
            <div className="h-3 w-16 rounded" style={{ background: '#141414', animation: 'shimmer 1.4s ease infinite', animationDelay: `${0.05 + i * 0.04}s` }} />
            <div className="flex-1 h-3 rounded" style={{ background: '#111', animation: 'shimmer 1.4s ease infinite', animationDelay: `${0.1 + i * 0.04}s` }} />
            <div className="h-5 w-14 rounded-full" style={{ background: '#141414', animation: 'shimmer 1.4s ease infinite', animationDelay: `${0.12 + i * 0.04}s` }} />
          </div>
        ))}
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
