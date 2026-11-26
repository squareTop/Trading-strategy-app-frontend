// 2026-11-04 (Build Spec Phase 4, item 4.6): the trade page. One logged trade on
// its stored daily bars (GET /api/signals/{id}/chart): candles, the strategy's own
// indicators, the signal / fill / exit marks, the stop and target from the fill,
// and the simulator's replay of the same trade beside the logged one, so a person
// can check by eye that the system entered and exited where its rules say.
// Chart: TradingView Lightweight Charts 5.2.1 (decision 9), loaded in the browser
// only (it draws on a canvas). No login, like the signals page (decision 11).
// 2026-11-26 (R3a.4): the chart itself now lives in components/StrategyChart.tsx,
// with the setup marks and the entry-condition checklist.
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { formatPrice } from '../../lib/utils'
import { API_URL } from '../../lib/config'
import { C, EntryConditions, StrategyChart, exitName } from '../../components/StrategyChart'
import type { Num, Replay, TradeChartPayload } from '../../components/StrategyChart'

const tradeChartQueryOptions = (id: string) => queryOptions({
  queryKey: ['tradeChart', id],
  queryFn: async () => {
    const response = await fetch(`${API_URL}/api/signals/${encodeURIComponent(id)}/chart`)
    if (response.status === 404) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body?.detail || `No chart for signal ${id}`)
    }
    if (!response.ok) throw new Error(`Failed to fetch the trade chart: error status ${response.status}`)
    return response.json() as Promise<TradeChartPayload>
  },
  staleTime: 5 * 60 * 1000,
})

export const Route = createFileRoute('/(home)/trade/$id')({
  head: () => ({
    meta: [
      { title: 'Trade chart | FoxelSignal' },
      { name: 'description', content: 'One logged trade on its daily bars, with the strategy\'s own indicators, its entry, levels and exit.' },
    ],
  }),
  component: TradePage,
})

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  target: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  stop: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-gray-50 text-gray-600 border-gray-200',
  exit: 'bg-amber-50 text-amber-700 border-amber-200',
  invalid: 'bg-gray-50 text-gray-500 border-gray-200',
}

function fmtR(r: Num | undefined): string {
  return r === null || r === undefined ? '—' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`
}
function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4)
  return String(v)
}

// ─── page ───────────────────────────────────────────────────────────────────
function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`font-mono text-sm font-bold ${tone || 'text-brand-dark'}`}>{value}</span>
    </div>
  )
}

function ReplayBox({ replay }: { replay: Replay | null }) {
  if (!replay) return null
  if (!replay.available) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600">
        <span className="font-bold text-gray-700">No replay.</span> {replay.reason}
      </div>
    )
  }
  if (replay.matches) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800">
        <span className="font-bold">Replay matches the logged trade.</span> The trade simulator, re-run on the same bars
        with the same inputs, fills and exits exactly where the forward log did.
      </div>
    )
  }
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
      <p className="font-bold mb-2">The replay differs from the logged trade (amber marks on the chart).</p>
      <table className="font-mono">
        <thead>
          <tr className="text-left text-amber-700"><th className="pr-6">Field</th><th className="pr-6">Logged</th><th>Replay</th></tr>
        </thead>
        <tbody>
          {(replay.differences || []).map((d) => (
            <tr key={d.field}><td className="pr-6">{d.field}</td><td className="pr-6">{fmtVal(d.logged)}</td><td>{fmtVal(d.replay)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TradePage() {
  const { id } = Route.useParams()
  const { data, isLoading, error, refetch } = useQuery(tradeChartQueryOptions(id))
  const s = data?.signal
  const r = s?.realized_r_net ?? s?.realized_r ?? null

  return (
    <div className="min-h-[calc(100vh-61px)] bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-12 flex flex-col">
      <main className="max-w-360 w-full mx-auto px-4 md:px-8 mt-8 flex-1 flex flex-col gap-6">
        <div className="flex items-center gap-4 text-xs font-mono">
          <Link to="/daily-signals" className="text-brand-primary hover:underline">← Signals</Link>
          <Link to="/scoreboard" className="text-brand-primary hover:underline">← Scoreboard</Link>
        </div>

        {isLoading && (
          <div className="bg-white border border-brand-border rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-12 h-12 rounded-full border-4 border-brand-bg border-t-brand-primary animate-spin mb-4"></div>
            <p className="font-display text-lg font-bold text-brand-dark">Loading the trade chart…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 shadow-xs">
            <h4 className="font-display text-base font-bold text-red-950">Trade chart unavailable</h4>
            <p className="text-sm text-red-800 mt-1">{(error as Error).message}</p>
            <button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && data && s && (
          <>
            <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider">
                  {s.display_name || s.selected_strategy || 'Signal'}{s.strategy_version ? ` · ${s.strategy_version}` : ''}
                </span>
                {s.stage && <span className="text-[10px] font-mono uppercase border rounded px-1.5 py-0.5 text-gray-500 border-gray-200">{s.stage}</span>}
                {s.ruleset_version && <span className="text-[10px] font-mono uppercase border rounded px-1.5 py-0.5 text-gray-500 border-gray-200">{s.ruleset_version}</span>}
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="font-display text-3xl font-extrabold text-brand-dark tracking-tight font-mono">{s.ticker}</h1>
                <span className={`text-xs font-bold uppercase ${s.direction === 'long' ? 'text-emerald-700' : 'text-red-700'}`}>{s.direction}</span>
                <span className={`text-[10px] font-mono font-bold uppercase border rounded px-2 py-0.5 ${STATUS_STYLE[s.status] || STATUS_STYLE.expired}`}>
                  {s.status}{s.exit_reason && s.exit_reason !== s.status ? ` · ${exitName(s.exit_reason)}` : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-5">
                <Fact label="Signal bar" value={s.signal_date} />
                <Fact label="Fill (next open)" value={s.fill_date ? `${s.fill_date} · ${formatPrice(s.fill_price as number, 'USD')}` : 'waiting'} />
                <Fact label="Stop" value={formatPrice((s.stop_level ?? s.stop) as number, 'USD')} tone="text-red-700" />
                <Fact label="Target" value={(s.fill_price !== null && s.target_level === null) ? 'none (own exit)' : formatPrice((s.target_level ?? s.target) as number, 'USD')} tone="text-emerald-700" />
                <Fact label="Exit" value={s.resolved_date ? `${s.resolved_date} · ${formatPrice(s.exit_price as number, 'USD')}` : 'open'} />
                <Fact label="Bars held" value={s.bars_held === null ? '—' : String(s.bars_held)} />
                <Fact label="Result (net)" value={fmtR(r)} tone={r === null ? undefined : r >= 0 ? 'text-emerald-700' : 'text-red-700'} />
                <Fact label="Cost (round trip)" value={s.cost_rt === null ? '—' : `${(s.cost_rt * 100).toFixed(2)}%`} />
              </div>
            </div>

            <ReplayBox replay={data.replay} />

            {data.bars.length > 0 ? <StrategyChart data={data} /> : null}

            <EntryConditions data={data} />

            <div className="bg-white border border-brand-border rounded-xl p-4 shadow-xs text-xs text-gray-600 grid gap-2 md:grid-cols-2">
              <div>
                <p className="font-bold text-brand-dark mb-1">Reading the chart</p>
                <ul className="space-y-0.5">
                  <li><span style={{ color: C.signal }}>▲</span> Signal: the completed bar the strategy fired on (its close is the reference entry).</li>
                  <li><span style={{ color: C.entry }}>●</span> Fill: the next open, where the trade is entered; the blue dotted line is that price.</li>
                  {data.levels?.target !== null && data.levels?.target !== undefined ? (
                    <li><span style={{ color: C.stop }}>- -</span> Stop and <span style={{ color: C.target }}>- -</span> target, placed the signal&apos;s distances from the fill (marked “ref” before the fill).</li>
                  ) : (
                    <li><span style={{ color: C.stop }}>- -</span> Stop, placed the signal&apos;s distance from the fill (marked “ref” before the fill). This version has no target.</li>
                  )}
                  <li>■ Exit, with its reason.</li>
                  <li><span style={{ color: C.replay }}>●■</span> Amber marks: where the replay fills or exits when it differs from the log.</li>
                  {(data.setup || []).length > 0 && <li><span style={{ color: C.setup }}>●</span> Violet dots: the bars that make the setup.</li>}
                </ul>
              </div>
              <div>
                <p className="font-bold text-brand-dark mb-1">Indicators</p>
                {data.overlays.length + data.panels.length === 0 ? (
                  <p>None for this row.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {data.overlays.map((o) => <li key={o.key}>On price: {o.label}</li>)}
                    {data.panels.map((p) => <li key={p.key}>Panel: {p.label}{p.levels.length ? ` (lines at ${p.levels.map((l) => l.value).join(', ')})` : ''}</li>)}
                  </ul>
                )}
                {data.notes.map((n) => <p key={n} className="mt-1 italic">{n}</p>)}
                {data.exit_rules && data.exit_rules.length > 0 && (
                  <>
                    <p className="font-bold text-brand-dark mt-3 mb-1">How this trade exits (whichever comes first)</p>
                    <ul className="space-y-0.5 list-disc pl-4">
                      {data.exit_rules.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  </>
                )}
                <p className="mt-2 text-gray-400">Daily bars, split-adjusted, from the price store: the bars the backtest and the forward log use.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
