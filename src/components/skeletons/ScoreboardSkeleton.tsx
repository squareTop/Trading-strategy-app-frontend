// 2026-11-12 (Scoreboard Rebuild): the loading state in the card shape - banner,
// a two-column grid of strategy cards (stacked on mobile), the retired bar.
export function ScoreboardSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans pb-20" aria-busy="true" aria-label="Loading the scoreboard">
      <main className="max-w-360 mx-auto px-4 md:px-8 mt-8">
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs mb-6 animate-pulse space-y-3">
          <div className="h-3.5 w-28 bg-brand-primary/20 rounded" />
          <div className="h-9 w-56 bg-gray-200 rounded-lg" />
          <div className="h-3.5 w-full max-w-xl bg-gray-100 rounded" />
          <div className="h-3 w-64 bg-gray-100 rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white border border-brand-border rounded-xl p-5 shadow-xs animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-36 bg-gray-200 rounded" />
                <div className="h-4 w-12 bg-gray-100 rounded" />
                <div className="h-4 w-16 bg-amber-100 rounded" />
              </div>
              <div className="h-3 w-56 bg-gray-100 rounded mb-4" />
              {Array.from({ length: 8 }).map((_, k) => (
                <div key={k} className="flex justify-between py-2 border-b border-brand-border/50 last:border-0">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              ))}
              <div className="h-40 w-full bg-gray-50 rounded mt-4" />
            </div>
          ))}
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-5 shadow-xs animate-pulse">
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </main>
    </div>
  )
}

export default ScoreboardSkeleton
