// 2026-11-04 (Build Spec Phase 4, item 4.6): the trade page. One logged trade on
// its stored daily bars (GET /api/signals/{id}/chart): candles, the strategy's own
// indicators, the signal / fill / exit marks, the stop and target from the fill,
// and the simulator's replay of the same trade beside the logged one, so a person
// can check by eye that the system entered and exited where its rules say.
// Chart: TradingView Lightweight Charts 5.2.1 (decision 9), loaded in the browser
// only (it draws on a canvas). No login, like the signals page (decision 11).
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { IChartApi, LineStyle, SeriesMarker, Time } from 'lightweight-charts'
import { formatPrice } from '../../lib/utils'
import { API_URL } from '../../lib/config'

type Num = number | null

interface ChartSeries { key: string; label: string; values: Num[] }
interface ChartPanel { key: string; label: string; series: ChartSeries[]; levels: { value: number; label: string }[]; range: [number, number] | null }
interface TradeMark { time: string; kind: 'signal' | 'fill' | 'exit'; price: Num; label: string }
interface ReplayDiff { field: string; logged: unknown; replay: unknown }
interface Replay {
  available: boolean
  reason?: string
  fill_date?: string | null
  fill_price?: Num
  status?: string
  resolved_date?: string | null
  exit_price?: Num
  exit_reason?: string | null
  realized_r_net?: Num
  matches?: boolean
  differences?: ReplayDiff[]
}
export interface TradeChartPayload {
  signal: {
    id: number; ticker: string; asset_class: string | null; selected_strategy: string | null
    strategy_version: string | null; display_name: string | null; style: string | null
    direction: 'long' | 'short'; status: string; stage: string | null; ruleset_version: string | null
    signal_date: string; entry: Num; stop: Num; target: Num; fill_date: string | null; fill_price: Num
    stop_level: Num; target_level: Num; cost_rt: Num; resolved_date: string | null; exit_price: Num
    exit_reason: string | null; bars_held: number | null; realized_r: Num; realized_r_net: Num
  }
  bars: { time: string; open: number; high: number; low: number; close: number; volume: Num }[]
  overlays: ChartSeries[]
  panels: ChartPanel[]
  marks: TradeMark[]
  levels: { basis: 'fill' | 'reference'; entry: Num; stop: Num; target: Num; from: string; to: string } | null
  replay: Replay | null
  notes: string[]
  exit_rules?: string[]       // 2026-11-05 (4.6 display fixes): how this trade exits, in words
  window?: { start: string; end: string; signal_index: number }
}

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

// ─── colours (DESIGN.md tokens) ─────────────────────────────────────────────
const C = {
  up: '#16a34a', down: '#dc2626', text: '#131d25', grid: '#efe8dc', border: '#e8dfd2',
  stop: '#dc2626', target: '#16a34a', entry: '#2563eb', signal: '#f97316', replay: '#d97706',
  volume: 'rgba(85, 95, 107, 0.35)', level: '#8c7164',
}
const OVERLAY_COLOURS: Record<string, string> = {
  bb_upper: '#6366f1', bb_lower: '#6366f1', bb_middle: '#a855f7', sma50: '#2563eb',
}
const SERIES_COLOURS = ['#2563eb', '#a855f7', '#0891b2', '#ca8a04']
// 2026-11-05 (4.6 display fixes): short names on the price axis and in the colour key
const OVERLAY_SHORT: Record<string, string> = {
  bb_upper: 'BB upper', bb_middle: 'BB middle', bb_lower: 'BB lower', sma50: 'SMA 50',
}
function overlayColour(key: string, i: number): string {
  return OVERLAY_COLOURS[key] || SERIES_COLOURS[i % SERIES_COLOURS.length]
}

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
// exit reasons as the simulator writes them -> plain words
function exitName(reason: string | null | undefined): string {
  const r = reason || ''
  if (r.startsWith('own_exit:')) return r.slice('own_exit:'.length).replace(/sma(\d+)_break/, 'Close below SMA $1').replace(/_/g, ' ')
  const names: Record<string, string> = {
    target: 'Target', stop: 'Stop', gap_stop: 'Stop (gap at the open)', expired: 'Time cap', exit: 'Strategy exit',
    break_even_stop: 'Break-even stop', trail_stop: 'Trailing stop', open: 'Open',
  }
  return names[r] || r.replace(/_/g, ' ')
}
function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4)
  return String(v)
}

// ─── the chart ──────────────────────────────────────────────────────────────
function TradeChart({ data }: { data: TradeChartPayload }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || data.bars.length === 0) return
    let chart: IChartApi | null = null
    let cancelled = false

    import('lightweight-charts').then((lwc) => {
      if (cancelled || !ref.current) return
      const nPanels = data.panels.length
      chart = lwc.createChart(el, {
        autoSize: true,
        layout: { background: { type: lwc.ColorType.Solid, color: '#ffffff' }, textColor: C.text, fontSize: 11 },
        grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
        rightPriceScale: { borderColor: C.border },
        timeScale: { borderColor: C.border, rightOffset: 4 },
        crosshair: { mode: lwc.CrosshairMode.Normal },
      })
      const ch = chart
      const times = data.bars.map((b) => b.time as Time)
      const line = (values: Num[]) => values.map((v, i) => (v === null ? { time: times[i] } : { time: times[i], value: v }))

      // pane 0: price, overlays, levels, marks
      const candles = ch.addSeries(lwc.CandlestickSeries, {
        upColor: C.up, downColor: C.down, borderUpColor: C.up, borderDownColor: C.down,
        wickUpColor: C.up, wickDownColor: C.down, priceLineVisible: false,
      }, 0)
      candles.setData(data.bars.map((b) => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })))

      data.overlays.forEach((o, i) => {
        const s = ch.addSeries(lwc.LineSeries, {
          color: overlayColour(o.key, i), lineWidth: 1,
          lineStyle: o.key === 'bb_middle' ? lwc.LineStyle.Dashed : lwc.LineStyle.Solid,
          priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
          title: OVERLAY_SHORT[o.key] || o.label,
        }, 0)
        s.setData(line(o.values))
      })

      // stop / target / entry as segments from the fill (or the signal bar) to the exit
      const lv = data.levels
      if (lv) {
        const span = data.bars.filter((b) => b.time >= lv.from && b.time <= lv.to).map((b) => b.time as Time)
        const segment = (price: Num, colour: string, title: string, style: LineStyle) => {
          if (price === null || span.length === 0) return
          const level: number = price
          const s = ch.addSeries(lwc.LineSeries, {
            color: colour, lineWidth: 2, lineStyle: style, priceLineVisible: false,
            lastValueVisible: true, crosshairMarkerVisible: false, title,
          }, 0)
          s.setData(span.map((t) => ({ time: t, value: level })))
        }
        const ref_ = lv.basis === 'reference' ? ' (ref)' : ''
        segment(lv.stop, C.stop, `Stop${ref_}`, lwc.LineStyle.Dashed)
        segment(lv.target, C.target, `Target${ref_}`, lwc.LineStyle.Dashed)
        segment(lv.entry, C.entry, lv.basis === 'fill' ? 'Fill' : 'Entry (ref)', lwc.LineStyle.Dotted)
      }

      const long = data.signal.direction === 'long'
      // the signal arrow sits under (long) / over (short) its bar; fill and exit sit at their own prices
      const markers: SeriesMarker<Time>[] = data.marks.map((m): SeriesMarker<Time> => {
        if (m.kind === 'signal' || m.price === null) {
          return { time: m.time as Time, position: long ? 'belowBar' : 'aboveBar', shape: long ? 'arrowUp' : 'arrowDown', color: C.signal, text: 'Signal' }
        }
        if (m.kind === 'fill') {
          return { time: m.time as Time, position: 'atPriceMiddle', price: m.price, shape: 'circle', color: C.entry, text: '' }
        }
        return { time: m.time as Time, position: 'atPriceMiddle', price: m.price, shape: 'square', color: C.text,
          text: exitName(data.signal.exit_reason || data.signal.status) }
      })
      const rp = data.replay
      if (rp && rp.available && rp.matches === false) {
        if (rp.fill_date && rp.fill_date !== data.signal.fill_date && rp.fill_price != null) {
          markers.push({ time: rp.fill_date as Time, position: 'atPriceMiddle', price: rp.fill_price, shape: 'circle', color: C.replay, text: 'Replay fill' })
        }
        if (rp.resolved_date && rp.resolved_date !== data.signal.resolved_date && rp.exit_price != null) {
          markers.push({ time: rp.resolved_date as Time, position: 'atPriceMiddle', price: rp.exit_price, shape: 'square', color: C.replay,
            text: `Replay: ${exitName(rp.exit_reason || rp.status || '')}` })
        }
      }
      const known = new Set(data.bars.map((b) => b.time))
      lwc.createSeriesMarkers(candles, markers
        .filter((m) => known.has(String(m.time)))
        .sort((a, b) => String(a.time).localeCompare(String(b.time))))

      // pane 1: volume
      const vol = ch.addSeries(lwc.HistogramSeries, {
        color: C.volume, priceLineVisible: false, lastValueVisible: false, priceFormat: { type: 'volume' },
      }, 1)
      vol.setData(data.bars.map((b) => (b.volume === null ? { time: b.time as Time } : { time: b.time as Time, value: b.volume })))

      // panes 2..: the strategy's indicator panels
      data.panels.forEach((p, pi) => {
        p.series.forEach((s, si) => {
          const ser = ch.addSeries(lwc.LineSeries, {
            color: SERIES_COLOURS[si % SERIES_COLOURS.length], lineWidth: 1, priceLineVisible: false,
            lastValueVisible: true, title: s.label,
          }, pi + 2)
          ser.setData(line(s.values))
          if (si === 0) {
            p.levels.forEach((l) => ser.createPriceLine({
              price: l.value, color: C.level, lineWidth: 1, lineStyle: lwc.LineStyle.Dotted,
              axisLabelVisible: true, title: l.label,
            }))
          }
        })
      })

      const panes = ch.panes()
      panes[0]?.setStretchFactor(4)
      panes[1]?.setStretchFactor(0.8)
      for (let i = 2; i < 2 + nPanels; i++) panes[i]?.setStretchFactor(1.4)

      // open on the trade: from 40 bars before the signal to the end of the window
      const si = data.window?.signal_index ?? 0
      ch.timeScale().setVisibleLogicalRange({ from: Math.max(0, si - 40), to: data.bars.length + 2 })

      ch.subscribeCrosshairMove((param) => {
        if (!param.time) { setHover(null); return }
        const bar = param.seriesData.get(candles) as { open?: number; high?: number; low?: number; close?: number } | undefined
        if (!bar || bar.close === undefined) { setHover(null); return }
        setHover(`${String(param.time)}  O ${bar.open?.toFixed(2)}  H ${bar.high?.toFixed(2)}  L ${bar.low?.toFixed(2)}  C ${bar.close.toFixed(2)}`)
      })
    })

    return () => {
      cancelled = true
      if (chart) chart.remove()
      chart = null
    }
  }, [data])

  const height = 460 + 140 * data.panels.length
  // 2026-11-05 (4.6 display fixes): a colour key for every line drawn on price
  const lv = data.levels
  const key: { label: string; colour: string; dash?: boolean }[] = [
    ...data.overlays.map((o, i) => ({ label: o.label, colour: overlayColour(o.key, i), dash: o.key === 'bb_middle' })),
    ...(lv && lv.stop !== null ? [{ label: lv.basis === 'reference' ? 'Stop (ref)' : 'Stop', colour: C.stop, dash: true }] : []),
    ...(lv && lv.target !== null ? [{ label: lv.basis === 'reference' ? 'Target (ref)' : 'Target', colour: C.target, dash: true }] : []),
    ...(lv && lv.entry !== null ? [{ label: lv.basis === 'fill' ? 'Fill price' : 'Entry (ref)', colour: C.entry, dash: true }] : []),
  ]
  return (
    <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
      <div className="px-4 py-2 border-b border-brand-border flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-gray-600">
        {key.map((k) => (
          <span key={k.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4" style={{ borderTop: `2px ${k.dash ? 'dashed' : 'solid'} ${k.colour}` }} />
            {k.label}
          </span>
        ))}
      </div>
      <div className="px-4 py-2 border-b border-brand-border font-mono text-[11px] text-gray-500 h-8">
        {hover || 'Hover the chart for a bar’s prices · scroll to zoom · drag to pan'}
      </div>
      <div ref={ref} style={{ height }} className="w-full" />
    </div>
  )
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

            {data.bars.length > 0 ? <TradeChart data={data} /> : null}

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
