import { useMemo } from 'react'
import { linearScale, niceTicks } from '#/lib/monte-carlo-utils'
import { useChartWidth } from '#/lib/use-chart-width'
import { fmtDay, fmtR } from '#/lib/scoreboard'
import type { ScorePoint } from '#/lib/types'

/**
 * 2026-11-12 (Scoreboard Rebuild): cumulative net R by exit date (one point per
 * exit date, the running sum of closed R), with the backtest's expectation as a
 * dashed line (backtest mean R per trade × trades closed so far). Hand-built
 * SVG sized with useChartWidth, like FanChart. The server sends every value;
 * nothing is calculated here except pixel positions.
 */

export const CUM_COLORS = {
  live: '#121d25',
  expected: '#f97316',
  zero: '#9ca3af',
  grid: '#efe8dd',
  axis: '#6b7280',
}

const PAD = { top: 12, right: 12, bottom: 26, left: 52 }

export function CumulativeRChart({ points, height = 180, ariaLabel }: { points: ScorePoint[]; height?: number; ariaLabel: string }) {
  const { ref, width: W } = useChartWidth<HTMLDivElement>(520)
  const H = height
  const hasExpected = points.some((p) => p.expected_r !== null && p.expected_r !== undefined)

  const geo = useMemo(() => {
    const ys = [0]
    for (const p of points) {
      ys.push(p.cum_r)
      if (p.expected_r !== null && p.expected_r !== undefined) ys.push(p.expected_r)
    }
    const lo = Math.min(...ys)
    const hi = Math.max(...ys)
    const ticks = niceTicks(lo, hi, 4)
    const y0 = Math.min(lo, ticks[0] ?? lo)
    const y1 = Math.max(hi, ticks[ticks.length - 1] ?? hi)
    // x = position from go-live: the start (0 trades, 0 R) then one step per exit date
    const n = points.length
    const sx = linearScale(0, Math.max(1, n), PAD.left, W - PAD.right)
    const sy = linearScale(y0, y1, H - PAD.bottom, PAD.top)
    const path = (key: 'cum_r' | 'expected_r') => {
      let d = `M${sx(0).toFixed(1)},${sy(0).toFixed(1)}`
      points.forEach((p, i) => {
        const v = p[key]
        if (v !== null && v !== undefined) d += ` L${sx(i + 1).toFixed(1)},${sy(v).toFixed(1)}`
      })
      return d
    }
    return { sx, sy, ticks, live: path('cum_r'), expected: path('expected_r'), n }
  }, [points, W, H])

  if (points.length === 0) return null
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1 text-[11px] font-mono text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5" style={{ background: CUM_COLORS.live }} />
          Live cumulative R
        </span>
        {hasExpected && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: CUM_COLORS.expected }} />
            Backtest expectation
          </span>
        )}
      </div>
      <div ref={ref} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full h-auto" role="img" aria-label={ariaLabel}>
          {geo.ticks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={geo.sy(t)} y2={geo.sy(t)} stroke={CUM_COLORS.grid} strokeWidth={1} />
              <text x={PAD.left - 6} y={geo.sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={CUM_COLORS.axis} fontFamily="JetBrains Mono, monospace">
                {t}R
              </text>
            </g>
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={geo.sy(0)} y2={geo.sy(0)} stroke={CUM_COLORS.zero} strokeWidth={1} />
          {hasExpected && (
            <path d={geo.expected} fill="none" stroke={CUM_COLORS.expected} strokeWidth={1.5} strokeDasharray="5 4" data-series="expected" />
          )}
          <path d={geo.live} fill="none" stroke={CUM_COLORS.live} strokeWidth={2} data-series="live" />
          <text x={PAD.left} y={H - 8} fontSize={10} fill={CUM_COLORS.axis} fontFamily="JetBrains Mono, monospace">
            {fmtDay(first.date, last.date)}
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={10} fill={CUM_COLORS.axis} fontFamily="JetBrains Mono, monospace">
            {fmtDay(last.date, last.date)} · {fmtR(last.cum_r)} after {last.trades}
          </text>
        </svg>
      </div>
    </div>
  )
}

export default CumulativeRChart
