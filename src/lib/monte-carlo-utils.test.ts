import { describe, it, expect } from 'vitest'
import {
  approxBars,
  bandPath,
  estimateSeconds,
  fmtDuration,
  fmtMoney,
  fmtOrdinal,
  fmtPct,
  fmtPF,
  fmtR,
  fmtShare,
  histogramBars,
  isActiveStatus,
  linePath,
  linearScale,
  nearestIndex,
  niceDomain,
  niceTicks,
  roundedTopBar,
} from './monte-carlo-utils'

describe('Monte Carlo formatting', () => {
  it('formats R with a sign and a real minus', () => {
    expect(fmtR(1.234)).toBe('+1.23R')
    expect(fmtR(-0.456, 3)).toBe('−0.456R')
    expect(fmtR(0)).toBe('0.00R')
    expect(fmtR(null)).toBe('—')
    expect(fmtR(Number.NaN)).toBe('—')
  })

  it('formats shares, percents and profit factors', () => {
    expect(fmtShare(0.283)).toBe('28.3%')
    expect(fmtShare(0.27)).toBe('27%')
    expect(fmtShare(0)).toBe('0%')
    expect(fmtPct(12.333)).toBe('12.3%')
    expect(fmtPF(1.2061)).toBe('1.21')
    expect(fmtPF(9999)).toBe('∞')
    expect(fmtPF(null)).toBe('—')
  })

  it('formats money in full and compact', () => {
    expect(fmtMoney(164463.18)).toBe('$164,463')
    expect(fmtMoney(1_250_000, true)).toBe('$1.3M')
    expect(fmtMoney(120_000, true)).toBe('$120K')
    expect(fmtMoney(95_500, true)).toBe('$95.5K')
    expect(fmtMoney(80_000, true)).toBe('$80K')
  })

  it('formats ordinals and durations', () => {
    expect(fmtOrdinal(54)).toBe('54th')
    expect(fmtOrdinal(1)).toBe('1st')
    expect(fmtOrdinal(22)).toBe('22nd')
    expect(fmtOrdinal(13)).toBe('13th')
    expect(fmtOrdinal(111)).toBe('111th')
    expect(fmtDuration(4)).toBe('a few seconds')
    expect(fmtDuration(42)).toBe('about 40 s')
    expect(fmtDuration(150)).toBe('about 3 min')
  })

  it('knows which statuses are still running', () => {
    expect(isActiveStatus('queued')).toBe(true)
    expect(isActiveStatus('running')).toBe(true)
    expect(isActiveStatus('done')).toBe(false)
    expect(isActiveStatus('failed')).toBe(false)
  })
})

describe('Mode B estimate (matches the server formula)', () => {
  it('counts trading days by asset kind', () => {
    expect(approxBars(10)).toBe(2520)
    expect(approxBars(5, 'crypto')).toBe(1825)
  })

  it('scales with paths and divides by worker processes', () => {
    // MR-A2: 0.030 s per path per 1,000 bars, 10 years, 100 paths, 2 workers -> 3.8 s
    expect(estimateSeconds(0.03, 2520, 100, 2)).toBe(3.8)
    expect(estimateSeconds(0.03, 2520, 1000, 2)).toBe(37.8)
    expect(estimateSeconds(0.03, 2520, 100, 0)).toBe(7.6) // never divides by zero
  })
})

describe('Chart geometry', () => {
  it('maps a domain to a range', () => {
    const s = linearScale(0, 10, 100, 200)
    expect(s(0)).toBe(100)
    expect(s(5)).toBe(150)
    expect(s(10)).toBe(200)
    const inverted = linearScale(0, 10, 300, 0)
    expect(inverted(10)).toBe(0)
  })

  it('makes nice ticks', () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100])
    expect(niceTicks(-17.9, 33.0, 5)).toEqual([-10, 0, 10, 20, 30])
    const t = niceTicks(95_000, 170_000, 5)
    expect(t[0]).toBeGreaterThanOrEqual(95_000)
    expect(t[t.length - 1]).toBeLessThanOrEqual(170_000)
    expect(niceTicks(5, 5).length).toBeGreaterThan(0)
  })

  it('pads a domain outward to nice steps', () => {
    const [a, b] = niceDomain(-17.9, 33.0, 5)
    expect(a).toBeLessThanOrEqual(-17.9)
    expect(b).toBeGreaterThanOrEqual(33.0)
  })

  it('builds line and band paths', () => {
    const sx = linearScale(0, 2, 0, 100)
    const sy = linearScale(0, 10, 100, 0)
    expect(linePath([0, 1, 2], [0, 5, 10], sx, sy)).toBe('M0 100L50 50L100 0')
    expect(bandPath([0, 2], [0, 0], [10, 10], sx, sy)).toBe('M0 0L100 0L100 100L0 100Z')
    expect(bandPath([], [], [], sx, sy)).toBe('')
  })

  it('finds the nearest x', () => {
    const xs = [0, 5, 10, 20]
    expect(nearestIndex(xs, -3)).toBe(0)
    expect(nearestIndex(xs, 6)).toBe(1)
    expect(nearestIndex(xs, 8)).toBe(2)
    expect(nearestIndex(xs, 99)).toBe(3)
    expect(nearestIndex([], 1)).toBe(-1)
  })

  it('lays out histogram bars with a 2px gap, capped width and the baseline at zero', () => {
    const edges = [0, 1, 2, 3]
    const counts = [5, 0, 10]
    const sx = linearScale(0, 3, 0, 300) // 100px per bin
    const sy = linearScale(0, 10, 200, 0)
    const bars = histogramBars(edges, counts, sx, sy)
    expect(bars).toHaveLength(3)
    expect(bars[0].w).toBe(24) // capped
    expect(bars[0].x).toBe(38) // centred in its 100px slot
    expect(bars[0].h).toBe(100)
    expect(bars[1].h).toBe(0)
    expect(bars[2].y).toBe(0)
    const narrow = histogramBars([0, 1, 2], [1, 1], linearScale(0, 2, 0, 20), sy)
    expect(narrow[0].w).toBe(8) // 10px slot - 2px gap
  })

  it('draws columns with a rounded top and a square base', () => {
    const d = roundedTopBar(10, 20, 20, 50)
    expect(d.startsWith('M10 70')).toBe(true) // starts at the square bottom-left
    expect(d).toContain('Q')
    expect(roundedTopBar(0, 0, 10, 0)).toBe('')
  })
})
