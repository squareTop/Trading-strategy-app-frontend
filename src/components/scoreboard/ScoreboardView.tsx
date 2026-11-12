import { useEffect, useState } from 'react'
import { fmtComputedAt, fmtDay } from '#/lib/scoreboard'
import type { ScoreboardV2Response } from '#/lib/types'
import ScoreboardSkeleton from '../skeletons/ScoreboardSkeleton'
import { RetiredList } from './RetiredList'
import { ScoreCard } from './ScoreCard'

/**
 * 2026-11-12 (Scoreboard Rebuild): the /scoreboard page body. One card per live
 * strategy version and direction (live, paper, forward; shadow versions are on
 * the Promotion page), then retired strategies. States: loading (skeleton),
 * error ("Scoreboard unavailable" + retry), nothing live, stale figures. A
 * #hash (e.g. from a signals-page badge) scrolls to that card, opening the
 * retired section when the card is there.
 */
export interface ScoreboardViewProps {
  data: ScoreboardV2Response | undefined
  isLoading: boolean
  error: unknown
  refetch: () => unknown
}

function useHash(): string | null {
  const [hash, setHash] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const read = () => setHash(decodeURIComponent(window.location.hash.replace(/^#/, '')) || null)
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  return hash
}

export function ScoreboardView({ data, isLoading, error, refetch }: ScoreboardViewProps) {
  const hash = useHash()

  useEffect(() => {
    if (!hash || !data || typeof document === 'undefined') return
    const t = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 60)
    return () => window.clearTimeout(t)
  }, [hash, data])

  if (isLoading && !data) return <ScoreboardSkeleton />

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      <main className="max-w-360 mx-auto px-4 md:px-8 mt-8">
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs mb-6">
          <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider block mb-1">Forward test</span>
          <h1 className="font-display text-2.5xl md:text-3.5xl font-extrabold text-brand-dark tracking-tight leading-none">Scoreboard</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Should you trust a strategy's next signal? Each card shows its live record per trade in net R, with the 95%
            range, against what its backtest expected. Every figure is per trade, in R; there is no account simulation.
          </p>
          {data && (
            <p className="text-xs font-mono text-gray-600 mt-3">
              Updated {fmtComputedAt(data.computed_at)} · data to {fmtDay(data.asof)}
            </p>
          )}
          {data?.stale && (
            <p role="status" className="mt-2 inline-block text-xs font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded px-2 py-1">
              Figures may be stale: the newest US session{data.expected_us_bar ? ` (${fmtDay(data.expected_us_bar)})` : ''} is not in them yet.
            </p>
          )}
        </div>

        {error != null && !data && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 shadow-xs mb-6">
            <h2 className="font-display text-base font-bold text-red-950">Scoreboard unavailable</h2>
            <p className="text-sm mt-1">{error instanceof Error ? error.message : 'The figures could not be loaded.'}</p>
            <button type="button" onClick={() => refetch()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
              Retry
            </button>
          </div>
        )}

        {data && (
          <>
            {data.live.length === 0 ? (
              <div className="bg-white border border-brand-border rounded-xl p-10 text-center shadow-xs mb-6">
                <p className="font-display text-lg font-bold text-brand-dark">No strategies are live yet</p>
                <p className="text-xs text-gray-500 mt-1">Versions at the shadow stage are on the Promotion page.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {data.live.map((c) => (
                  <ScoreCard key={c.anchor} card={c} tooltips={data.tooltips} minClosed={data.min_closed} />
                ))}
              </div>
            )}
            <RetiredList groups={data.retired} tooltips={data.tooltips} openAnchor={hash} />
          </>
        )}
      </main>
    </div>
  )
}

export default ScoreboardView
