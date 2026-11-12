import { describe, it, expect } from 'vitest'
import { anchorOf, cardKey, fmtComputedAt, fmtR, fmtRange, summaryLookup } from './scoreboard'

describe('scoreboard helpers', () => {
  it('formats R with a sign and two decimals', () => {
    expect(fmtR(0.214)).toBe('+0.21 R')
    expect(fmtR(-0.6)).toBe('−0.60 R')
    expect(fmtR(null)).toBe('—')
    expect(fmtRange(-0.3, 0.7)).toBe('−0.30 to +0.70 R')
  })

  it('shows computed_at in SGT', () => {
    expect(fmtComputedAt('2026-11-12T00:31:00+00:00')).toBe('12 Nov 2026 08:31 SGT')
    expect(fmtComputedAt('2026-11-12T00:31:00')).toBe('12 Nov 2026 08:31 SGT')   // naive = UTC
  })

  it('finds a row\'s card key and badge line like the server', () => {
    expect(cardKey({ strategy_version: 'MR-A2@2' })).toBe('MR-A2@2')
    expect(cardKey({ strategy_version: null, selected_strategy: 'uc1_dc1', ruleset_version: 'R0' })).toBe('uc1_dc1 · R0')
    expect(cardKey({ selected_strategy: 'MR-A' })).toBe('MR-A · pre-R0')
    expect(anchorOf('MR-A2@2', 'long')).toBe('mr-a2-2-long')
    expect(anchorOf('uc1_dc1 · R0', 'short')).toBe('uc1-dc1-r0-short')
    const find = summaryLookup({ computed_at: null, lines: [
      { key: 'MR-A2@2', direction: 'long', section: 'live', label: 'MR-A2@2', stage: 'forward', closed: 3,
        mean_r: 0.1, mean_r_lo: -1, mean_r_hi: 1, verdict: 'too_few', colour: 'neutral', record: 'r', anchor: 'mr-a2-2-long' },
    ] })
    expect(find({ strategy_version: 'MR-A2@2', direction: 'long' })?.anchor).toBe('mr-a2-2-long')
    expect(find({ strategy_version: 'MR-A2@2', direction: 'short' })).toBeNull()
    expect(summaryLookup(undefined)({ strategy_version: 'MR-A2@2', direction: 'long' })).toBeNull()
  })
})
