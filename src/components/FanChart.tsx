import { useMemo, useRef, useState } from 'react'
import type { McBands } from '#/lib/monte-carlo'
import { bandPath, linePath, linearScale, nearestIndex, niceDomain, niceTicks } from '#/lib/monte-carlo-utils'
import { useChartWidth } from '#/lib/use-chart-width'

/**
 * Fan chart of simulated paths by trade number (Monte Carlo Mode A).
 * Hand-rolled SVG like InteractiveChart: 5–95% and 25–75% bands, the median
 * line and faint sample paths, with a crosshair tooltip and a table view.
 * One data hue (blue = simulated); text stays in ink tokens.
 */

export const FAN_COLORS = {
  outer: 'rgba(0, 99, 152, 0.10)',
  inner: 'rgba(0, 99, 152, 0.24)',
  median: '#006398',
  sample: 'rgba(0, 99, 152, 0.16)',
  grid: '#efe8dd',
  axis: '#6b7280',
  baseline: '#121d25',
}

interface FanChartProps {
  x: number[]
  bands: McBands
  samples?: number[][]
  /** Values in tooltip and table, e.g. fmtMoney */
  format: (v: number) => string
  /** Y-axis tick labels (defaults to format) */
  axisFormat?: (v: number) => string
  xLabel?: string
  /** A reference level drawn as a hairline, e.g. the starting equity or 0R */
  baseline?: number
  baselineLabel?: string
  height?: number
  ariaLabel: string
}

const PAD = { top: 16, right: 16, bottom: 34, left: 64 }

export function FanChart({ x, bands, samples = [], format, axisFormat, xLabel = 'Trade number', baseline, baselineLabel, height = 300, ariaLabel }: FanChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const { ref: boxRef, width: W } = useChartWidth<HTMLDivElement>(720)
  const H = W < 480 ? Math.round(height * 0.8) : height
  const fmtAxis = axisFormat ?? format

  const geo = useMemo(() => {
    const all = [...bands.p5, ...bands.p95, ...samples.flat()]
    if (baseline !== undefined) all.push(baseline)
    const finite = all.filter(Number.isFinite)
    const [y0, y1] = niceDomain(Math.min(...finite), Math.max(...finite), 5)
    const sx = linearScale(x[0] ?? 0, x[x.length - 1] ?? 1, PAD.left, W - PAD.right)
    const sy = linearScale(y0, y1, H - PAD.bottom, PAD.top)
    return {
      sx,
      sy,
      yTicks: niceTicks(y0, y1, 5),
      xTicks: niceTicks(x[0] ?? 0, x[x.length - 1] ?? 1, W < 480 ? 4 : 6).filter((t) => t >= (x[0] ?? 0) && t <= (x[x.length - 1] ?? 1)),
      outer: bandPath(x, bands.p5, bands.p95, sx, sy),
      inner: bandPath(x, bands.p25, bands.p75, sx, sy),
      median: linePath(x, bands.p50, sx, sy),
      samplePaths: samples.map((s) => linePath(x, s, sx, sy)),
    }
  }, [x, bands, samples, baseline, H, W])

  if (x.length < 2) return null

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const vx = ((e.clientX - rect.left) / rect.width) * W
    const span = (x[x.length - 1] - x[0]) || 1
    const dataX = x[0] + ((vx - PAD.left) / (W - PAD.left - PAD.right)) * span
    setHover(nearestIndex(x, dataX))
  }

  const hx = hover !== null ? geo.sx(x[hover]) : null
  const tableRows = x.length <= 12 ? x.map((_, i) => i) : Array.from({ length: 11 }, (_, k) => Math.round((k / 10) * (x.length - 1)))

  return (
    <div className="w-full">
      {/* legend: several layers, so always shown */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[11px] font-mono text-gray-600">
        <LegendKey kind="line" color={FAN_COLORS.median} label="Median" />
        <LegendKey kind="area" color={FAN_COLORS.inner} label="25–75%" />
        <LegendKey kind="area" color={FAN_COLORS.outer} label="5–95%" border />
        {samples.length > 0 && <LegendKey kind="thin" color={FAN_COLORS.sample} label={`${samples.length} sample paths`} />}
      </div>

      <div className="relative" ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full h-auto select-none touch-none"
          role="img"
          aria-label={ariaLabel}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {geo.yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={geo.sy(t)} y2={geo.sy(t)} stroke={FAN_COLORS.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={geo.sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={FAN_COLORS.axis} fontFamily="JetBrains Mono, monospace">
                {fmtAxis(t)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((t) => (
            <text key={`x${t}`} x={geo.sx(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={11} fill={FAN_COLORS.axis} fontFamily="JetBrains Mono, monospace">
              {t}
            </text>
          ))}
          <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} textAnchor="middle" fontSize={11} fill={FAN_COLORS.axis}>
            {xLabel}
          </text>

          <path d={geo.outer} fill={FAN_COLORS.outer} />
          <path d={geo.inner} fill={FAN_COLORS.inner} />
          {geo.samplePaths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={FAN_COLORS.sample} strokeWidth={1} />
          ))}
          {baseline !== undefined && (
            <g>
              <line x1={PAD.left} x2={W - PAD.right} y1={geo.sy(baseline)} y2={geo.sy(baseline)} stroke={FAN_COLORS.baseline} strokeOpacity={0.45} strokeWidth={1} />
              {baselineLabel && (
                <text x={W - PAD.right} y={geo.sy(baseline) - 5} textAnchor="end" fontSize={10} fill={FAN_COLORS.axis}>
                  {baselineLabel}
                </text>
              )}
            </g>
          )}
          <path d={geo.median} fill="none" stroke={FAN_COLORS.median} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hx !== null && hover !== null && (
            <g pointerEvents="none">
              <line x1={hx} x2={hx} y1={PAD.top} y2={H - PAD.bottom} stroke={FAN_COLORS.baseline} strokeOpacity={0.35} strokeWidth={1} />
              <circle cx={hx} cy={geo.sy(bands.p50[hover])} r={4} fill={FAN_COLORS.median} stroke="#ffffff" strokeWidth={2} />
            </g>
          )}
        </svg>

        {hover !== null && hx !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-white border border-brand-border rounded-lg shadow-md px-3 py-2 text-[11px] font-mono text-brand-dark whitespace-nowrap z-10"
            style={hx / W > 0.6 ? { right: `${(1 - hx / W) * 100 + 2}%` } : { left: `${(hx / W) * 100 + 2}%` }}
          >
            <div className="text-gray-500 mb-1">{xLabel} {x[hover]}</div>
            <TipRow color={FAN_COLORS.median} value={format(bands.p50[hover])} label="median" strong />
            <TipRow color={FAN_COLORS.inner} value={`${format(bands.p25[hover])} – ${format(bands.p75[hover])}`} label="25–75%" />
            <TipRow color={FAN_COLORS.outer} value={`${format(bands.p5[hover])} – ${format(bands.p95[hover])}`} label="5–95%" />
          </div>
        )}
      </div>

      <details className="mt-2 text-[11px]">
        <summary className="cursor-pointer text-gray-500 font-mono hover:text-brand-primary select-none">View as table</summary>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-right font-mono tabular-nums border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-brand-border">
                <th className="text-left py-1 pr-3 font-semibold">{xLabel}</th>
                <th className="py-1 px-2 font-semibold">5%</th>
                <th className="py-1 px-2 font-semibold">25%</th>
                <th className="py-1 px-2 font-semibold">Median</th>
                <th className="py-1 px-2 font-semibold">75%</th>
                <th className="py-1 pl-2 font-semibold">95%</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((i) => (
                <tr key={i} className="odd:bg-brand-bg/50">
                  <td className="text-left py-1 pr-3">{x[i]}</td>
                  <td className="py-1 px-2">{format(bands.p5[i])}</td>
                  <td className="py-1 px-2">{format(bands.p25[i])}</td>
                  <td className="py-1 px-2 font-bold">{format(bands.p50[i])}</td>
                  <td className="py-1 px-2">{format(bands.p75[i])}</td>
                  <td className="py-1 pl-2">{format(bands.p95[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

function LegendKey({ kind, color, label, border }: { kind: 'line' | 'area' | 'thin'; color: string; label: string; border?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {kind === 'area' ? (
        <span className="inline-block w-3.5 h-2.5 rounded-sm" style={{ background: color, outline: border ? '1px solid rgba(0,99,152,0.25)' : undefined }} />
      ) : (
        <span className="inline-block w-4" style={{ height: kind === 'line' ? 2 : 1, background: color }} />
      )}
      <span>{label}</span>
    </span>
  )
}

function TipRow({ color, value, label, strong }: { color: string; value: string; label: string; strong?: boolean }) {
  return (
    <div className="flex items-center gap-2 leading-5">
      <span className="inline-block w-3" style={{ height: 2, background: color }} />
      <span className={strong ? 'font-bold' : ''}>{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  )
}

export default FanChart
