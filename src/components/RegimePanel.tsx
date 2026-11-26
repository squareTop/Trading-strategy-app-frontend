// 2026-11-26 (R3a step 5; design item 1): the regime panel on the signals page.
// GET /api/sector-regimes?level&window: the US Market line, one tile per group
// (Rally / Sideways / Correction, strength out of 5, days in the regime,
// breadth, 20-session return, a 60-session strip) and the universe staleness
// banner. Clicking a tile filters the signals table to that group.
import { queryOptions, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { API_URL } from '../lib/config'

export type RegimeLevel = 'sector' | 'industry' | 'theme'
export type SignalWindow = 'open' | '5' | '10' | '20'

export interface RegimeTile {
  level: string; group: string; members: number | null
  regime: 'Rally' | 'Sideways' | 'Correction' | null; regime_raw: string | null
  days_in_regime: number | null; strength: number | null
  breadth50_pct: number | null; ret20_pct: number | null; dd63_pct: number | null
  slope20_pct: number | null; vs_sma50_pct: number | null
  history?: { date: string; regime: string | null }[]
  signals?: number
}
export interface UniverseStatus {
  built_at_sgt: string | null; age_days: number | null; stale: boolean; stale_after_days: number
  tickers: number | null
  last_attempt: { at_utc: string | null; saved: boolean | null; breaching: string[] } | null
}
export interface SectorRegimesResponse {
  date: string | null; level: RegimeLevel; market: RegimeTile | null; groups: RegimeTile[]
  levels: RegimeLevel[]; window: number | null; universe: UniverseStatus
}

export const sectorRegimesQueryOptions = (level: RegimeLevel, window: SignalWindow) => queryOptions({
  queryKey: ['sectorRegimes', level, window],
  queryFn: async () => {
    const q = new URLSearchParams({ level, window })
    const response = await fetch(`${API_URL}/api/sector-regimes?${q}`)
    if (!response.ok) throw new Error(`Failed to fetch sector regimes: error status ${response.status}`)
    return response.json() as Promise<SectorRegimesResponse>
  },
  staleTime: 5 * 60 * 1000,
})

export const REGIME_STYLE: Record<string, { tile: string; chip: string; bar: string }> = {
  Rally: { tile: 'bg-emerald-50 border-emerald-200', chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: '#16a34a' },
  Sideways: { tile: 'bg-gray-50 border-gray-200', chip: 'bg-gray-100 text-gray-700 border-gray-300', bar: '#9ca3af' },
  Correction: { tile: 'bg-red-50 border-red-200', chip: 'bg-red-100 text-red-800 border-red-300', bar: '#dc2626' },
}
const NO_REGIME = { tile: 'bg-white border-brand-border', chip: 'bg-white text-gray-400 border-gray-200 border-dashed', bar: '#e5e7eb' }

export function RegimeChip({ regime, title }: { regime: string | null | undefined; title?: string }) {
  const st = (regime && REGIME_STYLE[regime]) || NO_REGIME
  return (
    <span title={title} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${st.chip}`}>
      {regime || 'n/a'}
    </span>
  )
}

function pct(v: number | null, sign = true): string {
  return v === null ? '—' : `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

function Strength({ n }: { n: number | null }) {
  return (
    <span className="inline-flex gap-0.5" title={n === null ? 'Strength not defined' : `Strength ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${n !== null && i <= n ? 'bg-brand-dark' : 'bg-gray-200'}`} />
      ))}
    </span>
  )
}

function Strip({ history }: { history: RegimeTile['history'] }) {
  const h = history || []
  if (h.length === 0) return null
  return (
    <div className="flex h-1.5 w-full rounded overflow-hidden mt-2" title={`Regime each session, ${h[0].date} (left) → ${h[h.length - 1].date} (right)`}>
      {h.map((x) => (
        <span key={x.date} className="flex-1" title={`${x.date}: ${x.regime || 'no regime'}`} style={{ background: ((x.regime && REGIME_STYLE[x.regime]) || NO_REGIME).bar }} />
      ))}
    </div>
  )
}

const LEVEL_NAMES: Record<RegimeLevel, string> = { sector: 'Sectors', industry: 'Industries', theme: 'Themes' }
const BREACH_NAMES: Record<string, string> = { crypto: 'crypto', total: 'the total' }
function breachName(g: string): string {
  return BREACH_NAMES[g] || g.replace(/^exchange:/, '').replace(/^etf:/, 'ETF ')
}

export function UniverseBanner({ u }: { u: UniverseStatus | undefined }) {
  if (!u || !u.stale) return null
  const la = u.last_attempt
  const refused = la && la.saved === false
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-900 mb-4">
      <span className="font-bold">Ticker universe is out of date.</span>{' '}
      {u.built_at_sgt
        ? <>Last rebuilt {u.built_at_sgt.slice(0, 10)}{u.age_days !== null ? ` (${Math.floor(u.age_days)} days ago)` : ''}; it should refresh weekly.</>
        : <>No rebuild on record.</>}
      {refused && la && (
        <> The last attempt{la.at_utc ? ` on ${la.at_utc.slice(0, 10)}` : ''} was refused by the shrink guard
          {la.breaching.length ? `: ${la.breaching.map(breachName).join(', ')} fell too far` : ''}.</>
      )}
      {' '}New listings are missed and delisted tickers stay in the scan until it is rebuilt.
    </div>
  )
}

export function RegimePanel(props: {
  level: RegimeLevel; onLevel: (l: RegimeLevel) => void
  group: string | null; onGroup: (g: string | null) => void
  window: SignalWindow
}) {
  const { level, onLevel, group, onGroup, window } = props
  const { data, isLoading, error } = useQuery(sectorRegimesQueryOptions(level, window))
  const [showAll, setShowAll] = useState(false)

  const groups = data?.groups || []
  // industries: ~140 groups; by default only those with signals in the window
  const many = level === 'industry' && !showAll
  const shown = many ? groups.filter((g) => (g.signals || 0) > 0 || g.group === group) : groups
  const m = data?.market

  return (
    <div className="mb-8">
      <UniverseBanner u={data?.universe} />
      <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-brand-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider block">Market regime</span>
            {m ? (
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                <span className="font-bold text-brand-dark">{m.group}</span>
                <RegimeChip regime={m.regime} />
                <Strength n={m.strength} />
                <span className="text-xs text-gray-500">
                  for {m.days_in_regime ?? '—'} sessions · {pct(m.breadth50_pct, false)} of stocks above their 50-day average · {pct(m.ret20_pct)} over the last month · {pct(m.dd63_pct)} from its 3-month high
                </span>
                {m.regime_raw && m.regime_raw !== m.regime && (
                  <span className="text-[11px] text-amber-700" title="A new regime counts only after 3 sessions in a row">
                    (today reads {m.regime_raw}; not confirmed yet)
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">{isLoading ? 'Loading…' : error ? 'Regimes unavailable.' : 'Not computed yet.'}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold">
            {(data?.levels || ['sector', 'industry', 'theme'] as RegimeLevel[]).map((l) => (
              <button
                key={l} type="button" onClick={() => { onLevel(l); onGroup(null) }}
                className={`px-3 py-1.5 rounded-lg border cursor-pointer ${l === level ? 'bg-brand-dark text-white border-brand-dark' : 'bg-brand-bg/40 text-gray-700 border-brand-border hover:bg-brand-border/30'}`}
              >
                {LEVEL_NAMES[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6">
          {shown.length === 0 ? (
            <p className="text-xs text-gray-400">
              {isLoading ? 'Loading…' : many && groups.length ? 'No industry has a signal in this window.' : 'No groups at this level yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {shown.map((t) => {
                const st = (t.regime && REGIME_STYLE[t.regime]) || NO_REGIME
                const on = t.group === group
                return (
                  <button
                    key={t.group} type="button" onClick={() => onGroup(on ? null : t.group)}
                    title={`${t.group}: ${t.members ?? '?'} members, equal-weight index. ${t.regime_raw && t.regime_raw !== t.regime ? `Today's raw reading: ${t.regime_raw} (not confirmed for 3 sessions yet). ` : ''}Click to ${on ? 'clear the filter' : 'list its signals'}.`}
                    className={`text-left rounded-lg border p-3 cursor-pointer transition-all ${st.tile} ${on ? 'ring-2 ring-brand-primary' : 'hover:shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-brand-dark leading-tight">{t.group}</span>
                      {(t.signals || 0) > 0 && (
                        <span className="shrink-0 text-[10px] font-mono font-bold bg-white border border-brand-border rounded px-1.5" title="Signals in this group in the selected window">
                          {t.signals} {t.signals === 1 ? 'signal' : 'signals'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <RegimeChip regime={t.regime} />
                      <Strength n={t.strength} />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      {t.days_in_regime ?? '—'} sessions in it · <span className="font-mono">{pct(t.ret20_pct)}</span> last month<br />
                      <span className="font-mono">{pct(t.breadth50_pct, false)}</span> of stocks above 50-day avg<br />
                      index <span className="font-mono">{pct(t.vs_sma50_pct)}</span> vs its 50-day avg
                      {t.regime_raw && t.regime_raw !== t.regime && <span className="block text-amber-700">today reads {t.regime_raw}</span>}
                    </div>
                    <Strip history={t.history} />
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-gray-400">
            <span>
              {data?.date ? `As of ${data.date}. ` : ''}Each group is an equal-weight index of its stocks. Rally: index above its rising 50-day average and at least 55% of its stocks above theirs. Correction: index below its 50-day average, falling or 8%+ off its 3-month high, and 45% or fewer of its stocks above theirs. Sideways: neither. A change counts after 3 sessions in a row. Dots: strength out of 5. Coloured bar: the last 60 sessions.
            </span>
            {level === 'industry' && groups.length > 0 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-brand-primary hover:underline cursor-pointer">
                {showAll ? 'Only industries with signals' : `Show all ${groups.length} industries`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
