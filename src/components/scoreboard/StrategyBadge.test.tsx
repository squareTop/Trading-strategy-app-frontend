import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StrategyBadge } from './StrategyBadge'
import { line } from './fixtures'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, hash, ...rest }: any) => <a href={`${to}${hash ? `#${hash}` : ''}`} {...rest}>{children}</a>,
}))

describe('StrategyBadge', () => {
  it('is grey under 30 closed', () => {
    const html = renderToStaticMarkup(<StrategyBadge line={line({ closed: 12, colour: 'neutral', verdict: 'too_few',
      record: 'smooth_trend@2 · forward · too few trades to judge (12 closed)' })} />)
    expect(html).toContain('data-colour="neutral"')
    expect(html).toContain('text-gray-700')
    expect(html).toContain('too few trades to judge (12 closed)')
  })

  it('is green when the range is above 0 and red when wholly below, with the meaning in words', () => {
    const g = renderToStaticMarkup(<StrategyBadge line={line({ colour: 'green' })} />)
    expect(g).toContain('text-emerald-800')
    expect(g).toContain('range above 0')
    const r = renderToStaticMarkup(<StrategyBadge line={line({ colour: 'red' })} />)
    expect(r).toContain('text-red-800')
    expect(r).toContain('range below 0')
    expect(r).toContain('412 closed · -0.12 R/trade · below backtest')
  })

  it('links to the version card; a shadow line has no link; no line shows nothing', () => {
    expect(renderToStaticMarkup(<StrategyBadge line={line()} />)).toContain('href="/scoreboard#smooth-trend-2-long"')
    const s = renderToStaticMarkup(<StrategyBadge line={line({ anchor: null, stage: 'shadow', colour: 'neutral' })} />)
    expect(s).not.toContain('href=')
    expect(renderToStaticMarkup(<StrategyBadge line={null} />)).toBe('')
  })
})
