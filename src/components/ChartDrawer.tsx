// 2026-11-26 (R3a step 5): the strategy chart in a side drawer on the signals
// page, so a signal can be checked without leaving the table. Same payload and
// drawing as the trade page (GET /api/signals/{id}/chart, StrategyChart).
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { API_URL } from '../lib/config'
import { EntryConditions, StrategyChart } from './StrategyChart'
import type { TradeChartPayload } from './StrategyChart'

export function ChartDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tradeChart', String(id)],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/signals/${id}/chart`)
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body?.detail || `No chart (error status ${r.status})`)
      }
      return r.json() as Promise<TradeChartPayload>
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (id === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, onClose])

  if (id === null) return null
  const s = data?.signal
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative h-full w-full md:w-[min(1100px,80vw)] bg-brand-bg shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-brand-border px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-2 min-w-0">
            <span className="font-mono font-black text-lg text-brand-dark">{s?.ticker ?? '…'}</span>
            {s && <span className={`text-xs font-bold uppercase ${s.direction === 'long' ? 'text-emerald-700' : 'text-red-700'}`}>{s.direction}</span>}
            {s && <span className="font-mono text-xs text-gray-500 truncate">{s.display_name || s.selected_strategy}{s.strategy_version ? ` · ${s.strategy_version}` : ''} · signal {s.signal_date}</span>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {id !== null && (
              <Link to="/trade/$id" params={{ id: String(id) }} className="text-xs font-mono text-brand-primary hover:underline">
                Full page ↗
              </Link>
            )}
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-brand-dark text-lg leading-none cursor-pointer" aria-label="Close">✕</button>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {isLoading && <p className="text-sm text-gray-500">Loading the chart…</p>}
          {error && <p className="text-sm text-red-700">{(error as Error).message}</p>}
          {data && data.bars.length > 0 && <StrategyChart data={data} />}
          {data && <EntryConditions data={data} />}
          {data && data.notes.length > 0 && (
            <div className="text-xs text-gray-500 italic">{data.notes.map((n) => <p key={n}>{n}</p>)}</div>
          )}
        </div>
      </aside>
    </div>
  )
}
