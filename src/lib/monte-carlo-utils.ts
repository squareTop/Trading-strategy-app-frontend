/**
 * Pure helpers for the Monte Carlo page: formatting, the Mode B time estimate,
 * and SVG geometry for FanChart / Histogram. No React, no network — unit tested
 * in monte-carlo-utils.test.ts.
 */

export type McStatus = 'queued' | 'running' | 'done' | 'failed'

export function isActiveStatus(status: McStatus | string | null | undefined): boolean {
  return status === 'queued' || status === 'running'
}

// ── formatting ──────────────────────────────────────────────────────────────
const DASH = '—'

function bad(v: number | null | undefined): v is null | undefined {
  return v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)
}

/** +1.23R / −0.45R */
export function fmtR(v: number | null | undefined, digits = 2): string {
  if (bad(v)) return DASH
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sign}${Math.abs(v).toFixed(digits)}R`
}

/** A 0–1 share as a percentage: 0.283 -> "28.3%" (whole numbers drop the decimal). */
export function fmtShare(v: number | null | undefined, digits = 1): string {
  if (bad(v)) return DASH
  return `${(v * 100).toFixed(digits).replace(/\.0+$/, '')}%`
}

/** A value already in percent: 12.33 -> "12.3%". */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (bad(v)) return DASH
  return `${v.toFixed(digits)}%`
}

/** Profit factor: 9999 (no losing trades) shows as "∞". */
export function fmtPF(v: number | null | undefined): string {
  if (bad(v)) return DASH
  if (v >= 9999) return '∞'
  return v.toFixed(2)
}

/** $164,463 or compact $1.2M for axis ticks. */
export function fmtMoney(v: number | null | undefined, compact = false): string {
  if (bad(v)) return DASH
  if (compact) {
    const a = Math.abs(v)
    const trim = (s: string) => s.replace(/\.0$/, '')
    if (a >= 1e9) return `$${trim((v / 1e9).toFixed(1))}B`
    if (a >= 1e6) return `$${trim((v / 1e6).toFixed(a >= 1e7 ? 0 : 1))}M`
    if (a >= 1e3) return `$${trim((v / 1e3).toFixed(a >= 1e5 ? 0 : 1))}K`
    return `$${v.toFixed(0)}`
  }
  return `$${Math.round(v).toLocaleString('en-US')}`
}

/** Percentile rank: 54 -> "54th", 1 -> "1st", 22 -> "22nd", 13 -> "13th". */
export function fmtOrdinal(v: number | null | undefined): string {
  if (bad(v)) return DASH
  const n = Math.round(v)
  const mod100 = n % 100
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** "about 45 s" / "about 2 min" */
export function fmtDuration(seconds: number | null | undefined): string {
  if (bad(seconds)) return DASH
  if (seconds < 10) return 'a few seconds'
  if (seconds < 90) return `about ${Math.round(seconds / 5) * 5} s`
  return `about ${Math.round(seconds / 60)} min`
}

// ── Mode B estimate ─────────────────────────────────────────────────────────
/** Trading days in the window: 252 a year for stocks/ETFs, 365 for crypto. */
export function approxBars(years: number, kind?: string | null): number {
  return Math.round(years * (kind === 'crypto' ? 365 : 252))
}

/** Same formula as app/montecarlo/paths.estimate_seconds on the server. */
export function estimateSeconds(secPerPathPer1000Bars: number, bars: number, nPaths: number, workers: number): number {
  const perPath = (secPerPathPer1000Bars * bars) / 1000
  return Math.round(((perPath * nPaths) / Math.max(1, workers)) * 10) / 10
}

// ── geometry ────────────────────────────────────────────────────────────────
export type Scale = (v: number) => number

export function linearScale(d0: number, d1: number, r0: number, r1: number): Scale {
  const span = d1 - d0 || 1
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0)
}

/** ~count "nice" ticks (1, 2 or 5 × 10^k steps) inside [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  // same step rule as d3's tickIncrement: 1, 2 or 5 × 10^k, whichever lands closest to `count` ticks
  const raw = (max - min) / Math.max(1, count)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const err = raw / mag
  const step = mag * (err >= Math.sqrt(50) ? 10 : err >= Math.sqrt(10) ? 5 : err >= Math.sqrt(2) ? 2 : 1)
  const start = Math.ceil(min / step - 1e-9) * step
  const ticks: number[] = []
  for (let t = start; t <= max + step * 1e-9; t += step) ticks.push(Math.round(t / step) * step)
  return ticks
}

/** Extend [min, max] outward to the nearest nice steps so the line never touches the frame. */
export function niceDomain(min: number, max: number, count = 5): [number, number] {
  const t = niceTicks(min, max, count)
  if (t.length < 2) return [min, max]
  const step = t[1] - t[0]
  return [Math.min(t[0], Math.floor(min / step) * step), Math.max(t[t.length - 1], Math.ceil(max / step) * step)]
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** SVG path "M x y L x y …" through the points. */
export function linePath(xs: number[], ys: number[], sx: Scale, sy: Scale): string {
  const n = Math.min(xs.length, ys.length)
  let d = ''
  for (let i = 0; i < n; i++) d += `${i === 0 ? 'M' : 'L'}${r2(sx(xs[i]))} ${r2(sy(ys[i]))}`
  return d
}

/** Closed SVG path for the area between lo and hi (a percentile band). */
export function bandPath(xs: number[], lo: number[], hi: number[], sx: Scale, sy: Scale): string {
  const n = Math.min(xs.length, lo.length, hi.length)
  if (n === 0) return ''
  let d = ''
  for (let i = 0; i < n; i++) d += `${i === 0 ? 'M' : 'L'}${r2(sx(xs[i]))} ${r2(sy(hi[i]))}`
  for (let i = n - 1; i >= 0; i--) d += `L${r2(sx(xs[i]))} ${r2(sy(lo[i]))}`
  return d + 'Z'
}

/** Index of the x value closest to `x` (xs ascending). */
export function nearestIndex(xs: number[], x: number): number {
  if (xs.length === 0) return -1
  let lo = 0
  let hi = xs.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  return Math.abs(xs[lo] - x) <= Math.abs(xs[hi] - x) ? lo : hi
}

export interface HistBar {
  i: number
  x: number
  y: number
  w: number
  h: number
  lo: number
  hi: number
  count: number
}

/** Bar rectangles for a histogram: a 2px surface gap between neighbours, width capped at 24px, centred in its bin. */
export function histogramBars(edges: number[], counts: number[], sx: Scale, sy: Scale, gap = 2, maxW = 24): HistBar[] {
  const bars: HistBar[] = []
  const base = sy(0)
  for (let i = 0; i < counts.length && i + 1 < edges.length; i++) {
    const x0 = sx(edges[i])
    const x1 = sx(edges[i + 1])
    const slot = Math.max(0, x1 - x0)
    const w = Math.max(1, Math.min(maxW, slot - gap))
    const top = sy(counts[i])
    bars.push({ i, x: r2(x0 + (slot - w) / 2), y: r2(top), w: r2(w), h: r2(Math.max(0, base - top)), lo: edges[i], hi: edges[i + 1], count: counts[i] })
  }
  return bars
}

/** SVG path for a column with a 4px rounded top and a square base. */
export function roundedTopBar(x: number, y: number, w: number, h: number, radius = 4): string {
  if (h <= 0) return ''
  const r = Math.min(radius, w / 2, h)
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`
}
