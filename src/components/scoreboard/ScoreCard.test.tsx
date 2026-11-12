import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScoreCard } from './ScoreCard'
import { MonthTable } from './MonthTable'
import { CumulativeRChart } from './CumulativeRChart'
import { makeCard, TOOLTIPS } from './fixtures'

// Router links render as plain anchors outside a router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, hash, params, ...rest }: any) => (
    <a href={`${String(to).replace('$id', params?.id ?? '')}${hash ? `#${hash}` : ''}`} {...rest}>{children}</a>
  ),
}))

describe('ScoreCard', () => {
  const html = renderToStaticMarkup(<ScoreCard card={makeCard()} tooltips={TOOLTIPS} />)

  it('renders every figure from the payload', () => {
    expect(html).toContain('smooth_trend@2')
    expect(html).toContain('Smooth Trend (Williams %R)')
    expect(html).toContain('forward')                        // stage chip
    expect(html).toContain('live since 3 Nov')
    expect(html).toContain('8 trading days')
    expect(html).toContain('14.3 signals a week')
    expect(html).toContain('41 closed · 18 open')
    expect(html).toContain('−0.62 R')                        // mean, signed, two decimals
    expect(html).toContain('−0.95 to −0.30 R')               // its 95% range
    expect(html).toContain('n=41')
    expect(html).toContain('−0.18 R')                        // backtest mean
    expect(html).toContain('>below<')                        // verdict tag
    expect(html).toContain('29%')                            // win rate
    expect(html).toContain('W +0.80 R')
    expect(html).toContain('L −1.00 R')
    expect(html).toContain('9 losses in a row')
    expect(html).toContain('drawdown −27.40 R')
    expect(html).toContain('4 bars')                         // median hold
    expect(html).toContain('16 priced · +3.40 R unrealised · 56% above 0')
    expect(html).toContain('2 awaiting fill')
    expect(html).toContain('range below 0')                  // the colour in words
    expect(html).toContain('id="smooth-trend-2-long"')       // badge deep-link target
    expect(html).toContain('href="#smooth-trend-r0-long"')   // earlier versions
    expect(html).toContain('title="Mean net R and 95% range"')   // tooltip
  })

  it('never shows ROI or a percentage of capital', () => {
    expect(html.toLowerCase()).not.toContain('roi')
    expect(html).not.toContain('Profit factor')
  })

  it('draws the chart only from 5 closed trades', () => {
    expect(html).toContain('data-series="live"')
    expect(html).toContain('data-series="expected"')
    expect(html).toContain('stroke-dasharray="5 4"')
    const few = renderToStaticMarkup(<ScoreCard card={makeCard({ closed: 3, show_chart: false })} />)
    expect(few).not.toContain('data-series="live"')
    expect(few).toContain('Chart from 5 closed trades (3 so far)')
  })

  it('says too few under 30 closed and stays grey', () => {
    const c = renderToStaticMarkup(<ScoreCard card={makeCard({ closed: 12, verdict: 'too_few', colour: 'neutral' })} />)
    expect(c).toContain('>too few<')
    expect(c).toContain('data-colour="neutral"')
    expect(c).not.toContain('range below 0')
  })

  it('shows a retired card with its retired date', () => {
    const c = renderToStaticMarkup(<ScoreCard card={makeCard({ section: 'retired', stage: 'archived', retired_on: '2026-10-30', retired_reason: 'failed 3.2g' })} />)
    expect(c).toContain('retired on 30 Oct 2026 · failed 3.2g')
    expect(c).not.toContain('live since')
  })
})

describe('MonthTable and chart', () => {
  it('lists month, closed, mean R, win rate, sum R', () => {
    const t = renderToStaticMarkup(<MonthTable rows={makeCard().by_month} />)
    expect(t).toContain('Nov 2026')
    expect(t).toContain('>41<')
    expect(t).toContain('−0.62 R')
    expect(t).toContain('29%')
    expect(t).toContain('−25.42 R')
  })

  it('labels the chart', () => {
    const svg = renderToStaticMarkup(<CumulativeRChart points={makeCard().cumulative} ariaLabel="cum" />)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label="cum"')
    expect(svg).toContain('Backtest expectation')
  })
})
