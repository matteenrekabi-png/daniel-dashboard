export default function DashboardLoading() {
  const shimmer = {
    background: 'linear-gradient(90deg, #141414 25%, #1f1f1f 50%, #141414 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s ease infinite',
  }

  return (
    <div className="space-y-8" style={{ animation: 'pageFadeIn 0.15s ease both' }}>
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-lg" style={shimmer} />
        <div className="h-4 w-52 rounded" style={{ ...shimmer, animationDelay: '0.1s' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="p-6 rounded-xl" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
            <div className="h-3 w-24 rounded mb-4" style={{ ...shimmer, animationDelay: `${i * 0.08}s` }} />
            <div className="h-9 w-16 rounded-lg" style={{ ...shimmer, animationDelay: `${0.05 + i * 0.08}s` }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="p-6 rounded-xl" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
            <div className="h-4 w-32 rounded mb-4" style={{ ...shimmer, animationDelay: `${0.1 + i * 0.06}s` }} />
            {[0, 1, 2, 3].map(j => (
              <div key={j} className="py-3" style={{ borderBottom: j < 3 ? '1px solid #0f0f0f' : 'none' }}>
                <div className="h-3 rounded mb-1.5" style={{ ...shimmer, width: `${65 + j * 8}%`, animationDelay: `${0.15 + j * 0.05}s` }} />
                <div className="h-3 w-1/2 rounded" style={{ ...shimmer, animationDelay: `${0.2 + j * 0.05}s` }} />
              </div>
            ))}
          </div>
        ))}
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
