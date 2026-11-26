// 2026-11-26 (R3a step 4): the strategy chart, moved out of the trade page
// (routes/(home)/trade.$id.tsx, Build Spec 4.6) so other pages can draw it.
// One logged signal on its stored daily bars (GET /api/signals/{id}/chart):
// candles, the strategy's own indicators, the signal / fill / exit marks, the
// stop and target, the replay marks, and from R3a.4 the bars that make the
// setup (violet dots) and the checklist of entry conditions on the signal bar.
// Chart: TradingView Lightweight Charts 5.2.1, loaded in the browser only.
import { useEffect, useRef, useState } from 'react'
import type { IChartApi, LineStyle, SeriesMarker, Time } from 'lightweight-charts'

export type Num = number | null

export interface ChartSeries { key: string; label: string; values: Num[] }
export interface ChartPanel { key: string; label: string; series: ChartSeries[]; levels: { value: number; label: string }[]; range: [number, number] | null }
export interface TradeMark { time: string; kind: 'signal' | 'fill' | 'exit'; price: Num; label: string }
export interface ReplayDiff { field: string; logged: unknown; replay: unknown }
export interface Replay {
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
  conditions?: EntryCondition[]   // 2026-11-26 (R3a.4): every entry condition on the signal bar
  setup?: SetupMark[]             // 2026-11-26 (R3a.4): the bars that make the setup
}
// 2026-11-26 (R3a.4): why the strategy fired (StrategySpec.explain on the backend)
export interface EntryCondition { label: string; value: string; rule: string; pass: boolean | null }
export interface SetupMark { time: string; label: string; price: Num }

// ─── colours (DESIGN.md tokens) ─────────────────────────────────────────────
export const C = {
  up: '#16a34a', down: '#dc2626', text: '#131d25', grid: '#efe8dc', border: '#e8dfd2',
  stop: '#dc2626', target: '#16a34a', entry: '#2563eb', signal: '#f97316', replay: '#d97706',
  volume: 'rgba(85, 95, 107, 0.35)', level: '#8c7164', setup: '#7c3aed',
}
const OVERLAY_COLOURS: Record<string, string> = {
  bb_upper: '#6366f1', bb_lower: '#6366f1', bb_middle: '#a855f7', sma50: '#2563eb',
  sma20: '#0891b2', sma200: '#ca8a04',              // 2026-11-26 (R3a.4)
}
const SERIES_COLOURS = ['#2563eb', '#a855f7', '#0891b2', '#ca8a04']
// 2026-11-05 (4.6 display fixes): short names on the price axis and in the colour key
const OVERLAY_SHORT: Record<string, string> = {
  bb_upper: 'BB upper', bb_middle: 'BB middle', bb_lower: 'BB lower', sma50: 'SMA 50',
  sma20: 'SMA 20', sma200: 'SMA 200',               // 2026-11-26 (R3a.4)
}
export function overlayColour(key: string, i: number): string {
  return OVERLAY_COLOURS[key] || SERIES_COLOURS[i % SERIES_COLOURS.length]
}

// exit reasons as the simulator writes them -> plain words
// exit reasons as the simulator writes them -> plain words
export function exitName(reason: string | null | undefined): string {
  const r = reason || ''
  if (r.startsWith('own_exit:')) return r.slice('own_exit:'.length).replace(/sma(\d+)_break/, 'Close below SMA $1').replace(/_/g, ' ')
  const names: Record<string, string> = {
    target: 'Target', stop: 'Stop', gap_stop: 'Stop (gap at the open)', expired: 'Time cap', exit: 'Strategy exit',
    break_even_stop: 'Break-even stop', trail_stop: 'Trailing stop', open: 'Open',
  }
  return names[r] || r.replace(/_/g, ' ')
}

// ─── the chart ──────────────────────────────────────────────────────────────
export function StrategyChart({ data }: { data: TradeChartPayload }) {
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
      // 2026-11-26 (R3a.4): the bars that make the setup (cross, pullback, mother bar ...)
      for (const m of data.setup || []) {
        markers.push(m.price === null
          ? { time: m.time as Time, position: long ? 'belowBar' : 'aboveBar', shape: 'circle', color: C.setup, text: m.label }
          : { time: m.time as Time, position: 'atPriceMiddle', price: m.price, shape: 'circle', color: C.setup, text: m.label })
      }
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

// ─── entry conditions (2026-11-26, R3a.4) ───────────────────────────────────
export function EntryConditions({ data }: { data: TradeChartPayload }) {
  const conds = data.conditions || []
  if (conds.length === 0) return null
  const failed = conds.filter((c) => c.pass === false).length
  return (
    <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-border flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold text-sm text-brand-dark">Why it fired: entry conditions on the signal bar</p>
        <span className={`text-[11px] font-mono ${failed ? 'text-amber-700' : 'text-emerald-700'}`}>
          {failed ? `${failed} of ${conds.length} not met on today's bars` : `all ${conds.filter((c) => c.pass).length} met`}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <th className="px-4 py-2 w-8"></th><th className="px-2 py-2">Condition</th><th className="px-2 py-2">On the bar</th><th className="px-4 py-2">Rule</th>
          </tr>
        </thead>
        <tbody>
          {conds.map((c) => (
            <tr key={c.label} className="border-t border-brand-border/60 align-top">
              <td className={`px-4 py-2 font-bold ${c.pass === true ? 'text-emerald-600' : c.pass === false ? 'text-red-600' : 'text-gray-400'}`}>
                {c.pass === true ? '✓' : c.pass === false ? '✗' : '–'}
              </td>
              <td className="px-2 py-2 font-semibold text-brand-dark">{c.label}</td>
              <td className="px-2 py-2 font-mono text-gray-700">{c.value}</td>
              <td className="px-4 py-2 text-gray-500">{c.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(data.setup || []).length > 0 && (
        <p className="px-4 py-2 border-t border-brand-border text-[11px] text-gray-500">
          <span style={{ color: C.setup }}>●</span> Violet dots on the chart mark the setup: {(data.setup || []).map((m) => `${m.label} (${m.time})`).join(', ')}.
        </p>
      )}
    </div>
  )
}
