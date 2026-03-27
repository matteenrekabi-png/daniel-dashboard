export default function KnowledgeBaseLoading() {
  const shimmer = {
    background: 'linear-gradient(90deg, #141414 25%, #1f1f1f 50%, #141414 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s ease infinite',
  }

  return (
    <div className="space-y-6 max-w-2xl" style={{ animation: 'pageFadeIn 0.15s ease both' }}>
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg" style={shimmer} />
        <div className="h-4 w-64 rounded" style={{ ...shimmer, animationDelay: '0.05s' }} />
      </div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-xl" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#1f1f1f' }} />
              <div className="h-4 w-32 rounded" style={{ ...shimmer, animationDelay: `${i * 0.07}s` }} />
            </div>
            <div className="h-4 w-4 rounded" style={{ ...shimmer, animationDelay: `${0.05 + i * 0.07}s` }} />
          </div>
        </div>
      ))}
      <div className="h-10 w-44 rounded-lg" style={{ ...shimmer, animationDelay: '0.2s' }} />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
