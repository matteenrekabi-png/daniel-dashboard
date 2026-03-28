export default function PersonalityLoading() {
  const shimmer = {
    background: 'linear-gradient(90deg, #141414 25%, #1f1f1f 50%, #141414 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s ease infinite',
  }

  return (
    <div className="space-y-8 max-w-2xl" style={{ animation: 'pageFadeIn 0.15s ease both' }}>
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg" style={shimmer} />
        <div className="h-4 w-72 rounded" style={{ ...shimmer, animationDelay: '0.05s' }} />
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded" style={shimmer} />
          <div className="h-10 w-full rounded-lg" style={{ ...shimmer, animationDelay: '0.05s' }} />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-32 rounded" style={shimmer} />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 rounded-xl" style={{ border: '1px solid #1a1a1a', ...shimmer, animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-28 rounded" style={shimmer} />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 rounded-xl" style={{ border: '1px solid #1a1a1a', ...shimmer, animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
        <div className="h-10 w-44 rounded-lg" style={{ ...shimmer, animationDelay: '0.15s' }} />
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
