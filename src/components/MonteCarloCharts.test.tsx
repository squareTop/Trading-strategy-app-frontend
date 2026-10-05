import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FanChart } from './FanChart'
import { Histogram } from './Histogram'
import { BaseStrip, KpiTile } from './MonteCarloResults'
import type { McBase, McHistogram } from '#/lib/monte-carlo'

const x = [0, 10, 20, 30, 40]
const bands = {
  p5: [100, 95, 92, 90, 88],
  p25: [100, 99, 99, 100, 101],
  p50: [100, 102, 104, 106, 108],
  p75: [100, 105, 109, 112, 116],
  p95: [100, 110, 116, 122, 130],
}

const hist: McHistogram = {
  edges: [-2, -1, 0, 1, 2, 3],
  counts: [3, 10, 25, 9, 2],
  n: 49,
  clipped_high: 4,
  clipped_low: 0,
}

const count = (html: string, s: string) => html.split(s).length - 1

describe('FanChart', () => {
  it('draws two bands, the median, sample paths, a legend and a table view', () => {
    const html = renderToStaticMarkup(
      <FanChart x={x} bands={bands} samples={[[100, 101, 99, 103, 104], [100, 97, 96, 95, 99]]} format={(v) => `$${v}`} baseline={100} baselineLabel="Start" ariaLabel="fan" />,
    )
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="fan"')
    expect(count(html, 'fill="rgba(0, 99, 152, 0.10)"')).toBe(1) // 5–95% band
    expect(count(html, 'fill="rgba(0, 99, 152, 0.24)"')).toBe(1) // 25–75% band
    expect(count(html, 'stroke="rgba(0, 99, 152, 0.16)"')).toBe(2) // sample paths
    expect(html).toContain('stroke-width="2"') // median 2px
    expect(html).toContain('Median')
    expect(html).toContain('2 sample paths')
    expect(html).toContain('View as table')
    expect(html).toContain('Start')
    expect(count(html, '<tr')).toBe(1 + x.length) // header + one row per point (≤ 12 points)
  })

  it('renders nothing with fewer than two points', () => {
    expect(renderToStaticMarkup(<FanChart x={[0]} bands={{ p5: [1], p25: [1], p50: [1], p75: [1], p95: [1] }} format={String} ariaLabel="f" />)).toBe('')
  })
})

describe('Histogram', () => {
  it('draws one rounded column per bin with hit targets, markers with labels, and the clipping note', () => {
    const html = renderToStaticMarkup(
      <Histogram
        hist={hist}
        format={(v) => `${v}R`}
        xLabel="Total R"
        markers={[
          { value: 0.5, label: 'Real +0.5R', tone: 'real' },
          { value: 1.5, label: 'Gate', tone: 'ref' },
        ]}
        ariaLabel="hist"
      />,
    )
    expect(count(html, 'fill="#4d8fbf"')).toBe(5) // one bar per bin
    expect(count(html, 'fill="transparent"')).toBe(5) // a hit target per bin
    expect(html).toContain('Real +0.5R')
    expect(html).toContain('stroke="#ea580c"') // real backtest in orange
    expect(html).toContain('stroke-dasharray="4 3"') // reference line dashed
    expect(html).toContain('4 simulations above 3R are counted in the last bar')
  })
})

describe('Result tiles', () => {
  it('KPI tile shows label, value and sub-line', () => {
    const html = renderToStaticMarkup(<KpiTile label="Chance of ending negative" value="28.3%" sub="over 45 trades" />)
    expect(html).toContain('Chance of ending negative')
    expect(html).toContain('28.3%')
    expect(html).toContain('over 45 trades')
  })

  it('base strip shows R figures, the scanner line, and the small-sample warning under 30 trades', () => {
    const base: McBase = {
      trades: 17, wins: 6, win_rate: 0.3529, profit_factor: 1.4957, expectancy_r: 0.3509, total_r: 5.97, avg_hold_bars: 5.9,
      long: 17, short: 0, bars: 2514, first_bar: '2016-10-03', last_bar: '2026-10-02', max_dd_r: 4.2, longest_losing_streak: 5,
    }
    const html = renderToStaticMarkup(
      <BaseStrip base={base} scanner={{ trades: 17, profit_factor: 1.174, expectancy_r: 0.351, note: null }} years={10} dataAsof="2026-10-02" />,
    )
    expect(html).toContain('35.3%')
    expect(html).toContain('1.50')
    expect(html).toContain('+0.351R')
    expect(html).toContain('Scanner figures')
    expect(html).toContain('1.17')
    expect(html).toContain('Small sample: only 17 trades')
    const big = renderToStaticMarkup(
      <BaseStrip base={{ ...base, trades: 45 }} scanner={{ trades: 45, profit_factor: 1.2, expectancy_r: 0.15, note: null }} years={10} dataAsof="2026-10-02" />,
    )
    expect(big).not.toContain('Small sample')
  })
})
