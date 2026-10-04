import { useMemo, useState } from 'react'
import type { McHistogram } from '#/lib/monte-carlo'
import { histogramBars, linearScale, niceTicks, roundedTopBar } from '#/lib/monte-carlo-utils'
import { useChartWidth } from '#/lib/use-chart-width'

/**
 * Histogram for Monte Carlo results (total R, max drawdown, PF, expectancy).
 * Hand-rolled SVG: 30 bins from the API, 2px gaps, 4px rounded tops, a hover
 * tooltip per bar, and optional vertical markers (the real backtest, a gate).
 * Blue = simulated; orange marks the real backtest.
 */

export const HIST_COLORS = {
  bar: '#4d8fbf',
  barHover: '#006398',
  real: '#ea580c',
  ref: '#121d25',
  grid: '#efe8dd',
  axis: '#6b7280',
}

export interface HistogramMarker {
  value: number
  label: string
  tone: 'real' | 'ref'
}

interface HistogramProps {
  hist: McHistogram
  format: (v: number) => string
  markers?: HistogramMarker[]
  xLabel: string
  /** What one count is, for the tooltip: "simulations", "paths" */
  unit?: string
  height?: number
  ariaLabel: string
}

const PAD = { top: 28, right: 12, bottom: 36, left: 40 }

export function Histogram({ hist, format, markers = [], xLabel, unit = 'simulations', height = 220, ariaLabel }: HistogramProps) {
  const [hover, setHover] = useState<number | null>(null)
  const { ref: boxRef, width: W } = useChartWidth<HTMLDivElement>(400)
  const H = height

  const geo = useMemo(() => {
    const { edges, counts } = hist
    if (edges.length < 2) return null
    const vals = [edges[0], edges[edges.length - 1], ...markers.map((m) => m.value)].filter(Number.isFinite)
    let x0 = Math.min(...vals)
    let x1 = Math.max(...vals)
    const pad = (x1 - x0) * 0.03 || 1
    x0 -= pad
    x1 += pad
    const maxC = Math.max(1, ...counts)
    const yTicks = niceTicks(0, maxC, 3).filter((t) => t >= 0)
    const yTop = Math.max(maxC, yTicks[yTicks.length - 1] ?? maxC)
    const sx = linearScale(x0, x1, PAD.left, W - PAD.right)
    const sy = linearScale(0, yTop, H - PAD.bottom, PAD.top)
    const bars = histogramBars(edges, counts, sx, sy)
    const xTicks = niceTicks(x0, x1, W < 360 ? 4 : 5).filter((t) => t >= x0 && t <= x1)
    // marker labels: alternate rows when two markers sit close together
    const placed = markers
      .filter((m) => Number.isFinite(m.value))
      .map((m) => ({ ...m, px: sx(m.value) }))
      .sort((a, b) => a.px - b.px)
      .map((m, i, arr) => ({ ...m, row: i > 0 && Math.abs(m.px - arr[i - 1].px) < 100 ? 1 : 0 }))
    return { sx, sy, bars, xTicks, yTicks, placed }
  }, [hist, markers, H, W])

  if (!geo) return null
  const total = hist.counts.reduce((a, b) => a + b, 0) || 1
  const hb = hover !== null ? geo.bars[hover] : null

  return (
    <div className="w-full">
      <div className="relative" ref={boxRef}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full h-auto select-none" role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
          {geo.yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={geo.sy(t)} y2={geo.sy(t)} stroke={HIST_COLORS.grid} strokeWidth={1} />
              <text x={PAD.left - 6} y={geo.sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={HIST_COLORS.axis} fontFamily="JetBrains Mono, monospace">
                {t}
              </text>
            </g>
          ))}
          {geo.xTicks.map((t) => (
            <text key={`x${t}`} x={geo.sx(t)} y={H - PAD.bottom + 15} textAnchor="middle" fontSize={11} fill={HIST_COLORS.axis} fontFamily="JetBrains Mono, monospace">
              {format(t)}
            </text>
          ))}
          <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize={11} fill={HIST_COLORS.axis}>
            {xLabel}
          </text>

          {geo.bars.map((b) => (
            <path key={b.i} d={roundedTopBar(b.x, b.y, b.w, b.h)} fill={hover === b.i ? HIST_COLORS.barHover : HIST_COLORS.bar} />
          ))}

          {geo.placed.map((m) => (
            <g key={`${m.label}${m.value}`} pointerEvents="none">
              <line
                x1={m.px}
                x2={m.px}
                y1={PAD.top - 4 + m.row * 13}
                y2={H - PAD.bottom}
                stroke={m.tone === 'real' ? HIST_COLORS.real : HIST_COLORS.ref}
                strokeWidth={m.tone === 'real' ? 2 : 1}
                strokeDasharray={m.tone === 'ref' ? '4 3' : undefined}
              />
              <text
                x={m.px + (m.px > W * 0.75 ? -4 : 4)}
                y={PAD.top - 14 + m.row * 13}
                textAnchor={m.px > W * 0.75 ? 'end' : 'start'}
                fontSize={11}
                fontWeight={600}
                fill="#121d25"
              >
                {m.label}
              </text>
            </g>
          ))}

          {/* hit targets: the whole column slot, taller and wider than the bar */}
          {geo.bars.map((b) => {
            const x0 = geo.sx(b.lo)
            const x1 = geo.sx(b.hi)
            return (
              <rect
                key={`hit${b.i}`}
                x={x0}
                y={PAD.top}
                width={Math.max(1, x1 - x0)}
                height={H - PAD.bottom - PAD.top}
                fill="transparent"
                onPointerEnter={() => setHover(b.i)}
                onFocus={() => setHover(b.i)}
                tabIndex={-1}
              />
            )
          })}
        </svg>

        {hb && (
          <div
            className="absolute top-1 pointer-events-none bg-white border border-brand-border rounded-lg shadow-md px-2.5 py-1.5 text-[11px] font-mono text-brand-dark whitespace-nowrap z-10"
            style={hb.x / W > 0.6 ? { right: `${(1 - hb.x / W) * 100 + 1}%` } : { left: `${((hb.x + hb.w) / W) * 100 + 1}%` }}
          >
            <div className="font-bold">
              {hb.count} {unit} <span className="text-gray-500 font-normal">({((hb.count / total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="text-gray-500">
              {format(hb.lo)} to {format(hb.hi)}
            </div>
          </div>
        )}
      </div>
      {(hist.clipped_high > 0 || hist.clipped_low > 0) && (
        <p className="text-[10px] font-mono text-gray-400 mt-1">
          {hist.clipped_high > 0 && `${hist.clipped_high} ${unit} above ${format(hist.edges[hist.edges.length - 1])} are counted in the last bar. `}
          {hist.clipped_low > 0 && `${hist.clipped_low} ${unit} below ${format(hist.edges[0])} are counted in the first bar.`}
        </p>
      )}
    </div>
  )
}

export default Histogram
