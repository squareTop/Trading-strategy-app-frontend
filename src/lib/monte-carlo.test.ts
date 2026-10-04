import { describe, it, expect, vi, beforeEach } from 'vitest'
import { API_URL } from './config'
import {
  createMcRun,
  fetchMcRun,
  fetchMcRuns,
  fetchMcStrategies,
  fetchMcTickerInfo,
  mcKeys,
  McApiError,
  POLL_MS,
  runRefetchInterval,
  type McRun,
} from './monte-carlo'

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body })
  vi.stubGlobal('fetch', fn)
  return fn
}

const run = (status: McRun['status']): McRun =>
  ({ id: 'r1', status, mode: 'paths', progress: { done: 10, total: 100 } }) as unknown as McRun

describe('Monte Carlo API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reads strategies, ticker info, runs and one run with cookies', async () => {
    const f = mockFetch(200, { ok: true })
    await fetchMcStrategies()
    await fetchMcTickerInfo('BRK.B')
    await fetchMcRuns()
    await fetchMcRun('abc-123')
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      `${API_URL}/monte-carlo/strategies`,
      `${API_URL}/monte-carlo/ticker-info?symbol=BRK.B`,
      `${API_URL}/monte-carlo/runs`,
      `${API_URL}/monte-carlo/runs/abc-123`,
    ])
    for (const c of f.mock.calls) expect(c[1]).toEqual(expect.objectContaining({ credentials: 'include' }))
  })

  it('posts a run as JSON and returns the run (Mode A 200 / Mode B 202)', async () => {
    const f = mockFetch(202, { id: 'r9', status: 'queued' })
    const body = { ticker: 'AAPL', strategy: 'MR-A2', mode: 'paths' as const, n_sims: 100, years: 10, seed: 7 }
    const out = await createMcRun(body)
    expect(out).toEqual({ id: 'r9', status: 'queued' })
    expect(f).toHaveBeenCalledWith(
      `${API_URL}/monte-carlo/runs`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
    )
  })

  it('surfaces the server message for 422 and 409', async () => {
    mockFetch(422, { detail: 'Only 2 trades in this history — too few to simulate (minimum 10).' })
    await expect(createMcRun({ ticker: 'SPY', strategy: 'sma_cross', mode: 'trades' })).rejects.toThrow('too few to simulate')
    mockFetch(409, { detail: 'You already have a synthetic-price run in progress. One run at a time.' })
    const err = await createMcRun({ ticker: 'SPY', strategy: 'MR-A2', mode: 'paths' }).catch((e) => e)
    expect(err).toBeInstanceOf(McApiError)
    expect(err.status).toBe(409)
    expect(err.message).toContain('One run at a time')
  })

  it('gives a sign-in message for 401 and a generic one for validation lists', async () => {
    mockFetch(401, { detail: 'Could not validate credentials' })
    await expect(fetchMcRuns()).rejects.toThrow('Please sign in')
    mockFetch(422, { detail: [{ loc: ['body', 'ticker'], msg: 'field required' }] })
    await expect(createMcRun({ ticker: '', strategy: 'MR-A2', mode: 'trades' })).rejects.toThrow('Some inputs are invalid')
  })

  it('polls a run every 2 s only while it is queued or running', () => {
    expect(POLL_MS).toBe(2000)
    expect(runRefetchInterval(run('queued'))).toBe(2000)
    expect(runRefetchInterval(run('running'))).toBe(2000)
    expect(runRefetchInterval(run('done'))).toBe(false)
    expect(runRefetchInterval(run('failed'))).toBe(false)
    expect(runRefetchInterval(undefined)).toBe(false)
  })

  it('uses stable query keys', () => {
    expect(mcKeys.run('x')).toEqual(['monte-carlo', 'run', 'x'])
    expect(mcKeys.runs).toEqual(['monte-carlo', 'runs'])
    expect(mcKeys.ticker('SPY')).toEqual(['monte-carlo', 'ticker', 'SPY'])
  })
})
