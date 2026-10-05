/**
 * Monte Carlo simulator — data access (modelled on watchlist.ts).
 *
 * Backend: app/routes/monte_carlo.py (logged-in users only, cookie auth).
 *   GET  /monte-carlo/strategies      strategy list, limits, defaults, estimate figures
 *   GET  /monte-carlo/ticker-info     ticker kind + designed-universe warning per strategy
 *   POST /monte-carlo/runs            Mode A -> 200 finished run; Mode B -> 202 queued run
 *   GET  /monte-carlo/runs            last 20 runs (no result payloads)
 *   GET  /monte-carlo/runs/{id}       one run; polled every 2 s while queued / running
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL } from './config'
import { isActiveStatus, type McStatus } from './monte-carlo-utils'

export type { McStatus } from './monte-carlo-utils'
export type McMode = 'trades' | 'paths'
export type McFamily = 'trend' | 'mean_reversion' | 'price_action'

export interface McStrategy {
  key: string
  display: string
  family: McFamily
  directions: string[]
  designed_kinds: string[]
  est_seconds_per_path_per_1000_bars: number
}

export interface McStrategiesResponse {
  strategies: McStrategy[]
  worker_processes: number
  limits: {
    mode_a_n_sims: number[]
    mode_b_n_paths: number[]
    years: number[]
    horizon: [number, number]
    risk_pct: [number, number]
    block_len: [number, number]
    min_trades: number
    warn_trades: number
  }
  defaults: {
    mode: McMode
    n_sims_trades: number
    n_sims_paths: number
    years: number
    risk_pct: number
    start_equity: number
    block_len: number
    dd_threshold_pct: number
  }
}

export interface McTickerInfo {
  ticker: string
  kind: 'equity' | 'etf' | 'crypto' | 'sg_equity' | string
  name: string | null
  warnings: Record<string, string | null>
}

export interface McRunRequest {
  ticker: string
  strategy: string
  mode: McMode
  n_sims?: number
  horizon_trades?: number | null
  risk_pct?: number
  start_equity?: number
  years?: number
  block_len?: number
  dd_threshold_pct?: number
  seed?: number | null
}

export interface McPercentiles {
  p5: number | null
  p25: number | null
  p50: number | null
  p75: number | null
  p95: number | null
  mean: number | null
}

export interface McHistogram {
  edges: number[]
  counts: number[]
  n: number
  clipped_high: number
  clipped_low: number
}

export type McBands = Record<'p5' | 'p25' | 'p50' | 'p75' | 'p95', number[]>

/** The real backtest, in R (same definitions for every strategy family). */
export interface McBase {
  trades: number
  wins: number
  win_rate: number | null
  profit_factor: number | null
  expectancy_r: number | null
  total_r: number
  avg_hold_bars: number | null
  long: number
  short: number
  bars: number
  first_bar: string | null
  last_bar: string | null
  max_dd_r: number
  longest_losing_streak: number
}

/** The strategy engine's own figures (what the scanner reports). */
export interface McScannerFigures {
  trades: number | null
  profit_factor: number | null
  expectancy_r: number | null
  note: string | null
}

interface McResultCommon {
  code_version: string
  seed: number
  ticker: string
  strategy: string
  family: McFamily
  base: McBase
  scanner_figures: McScannerFigures
  warnings: string[]
  note: string
  data_asof: string
  years: number
  timing: Record<string, number | null>
}

export interface McModeAResult extends McResultCommon {
  mode: 'trades'
  params: { n_sims: number; horizon_trades: number | null; risk_pct: number; start_equity: number; dd_threshold_pct: number; seed: number }
  horizon_trades_used: number
  kpis: {
    median_total_r: number | null
    total_r_p5: number | null
    total_r_p95: number | null
    median_max_dd_pct: number | null
    p95_max_dd_pct: number | null
    prob_negative: number | null
    prob_dd_breach: number | null
    dd_threshold_pct: number
    median_losing_streak: number | null
  }
  percentiles: Record<'total_r' | 'final_equity' | 'return_pct' | 'max_dd_r' | 'max_dd_pct' | 'losing_streak', McPercentiles>
  fan: { x: number[]; equity: McBands; r: McBands }
  sample_paths: { equity: number[][]; r: number[][] }
  histograms: { total_r: McHistogram; max_dd_pct: McHistogram }
}

export interface McModeBResult extends McResultCommon {
  mode: 'paths'
  params: { n_paths: number; block_len: number; seed: number }
  gate: { profit_factor: number; expectancy_r: number }
  real: { trades: number; win_rate: number | null; profit_factor: number | null; expectancy_r: number | null; total_r: number; max_dd_r: number }
  kpis: {
    share_pass_gate: number | null
    share_zero_trades: number | null
    median_pf: number | null
    median_expectancy_r: number | null
    p5_expectancy_r: number | null
    median_trades: number | null
    real_rank_pf: number | null
    real_rank_expectancy: number | null
    real_rank_total_r: number | null
  }
  percentiles: Record<'trades' | 'win_rate' | 'profit_factor' | 'expectancy_r' | 'total_r' | 'max_dd_r', McPercentiles>
  real_rank_pct: Record<'profit_factor' | 'expectancy_r' | 'total_r' | 'trades', number | null>
  histograms: { profit_factor: McHistogram; expectancy_r: McHistogram }
}

export type McResult = McModeAResult | McModeBResult

export interface McRun {
  id: string
  ticker: string
  strategy: string
  strategy_display: string
  mode: McMode
  years: number
  params: Record<string, number | null>
  seed: number
  data_asof: string
  code_version: string
  status: McStatus
  progress: { done: number; total: number }
  error: string | null
  created_at: string | null
  started_at: string | null
  finished_at: string | null
  cached: boolean
  result?: McResult | null
  headline?: Record<string, number | null> | null
  estimate_seconds?: number
}

export class McApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'McApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new McApiError('Please sign in to use the Monte Carlo simulator.', res.status)
    const detail = (data as { detail?: unknown }).detail
    const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? 'Some inputs are invalid. Check the values and try again.' : `Request failed (${res.status})`
    throw new McApiError(msg, res.status)
  }
  return data as T
}

export const fetchMcStrategies = () => request<McStrategiesResponse>('/monte-carlo/strategies')
export const fetchMcTickerInfo = (symbol: string) => request<McTickerInfo>(`/monte-carlo/ticker-info?symbol=${encodeURIComponent(symbol)}`)
export const fetchMcRun = (id: string) => request<McRun>(`/monte-carlo/runs/${encodeURIComponent(id)}`)
export const fetchMcRuns = () => request<McRun[]>('/monte-carlo/runs')
export const createMcRun = (body: McRunRequest) =>
  request<McRun>('/monte-carlo/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const mcKeys = {
  strategies: ['monte-carlo', 'strategies'] as const,
  ticker: (s: string) => ['monte-carlo', 'ticker', s] as const,
  run: (id: string) => ['monte-carlo', 'run', id] as const,
  runs: ['monte-carlo', 'runs'] as const,
}

export const POLL_MS = 2000

export const mcStrategiesQueryOptions = queryOptions({
  queryKey: mcKeys.strategies,
  queryFn: fetchMcStrategies,
  staleTime: 1000 * 60 * 60,
})

export function useMcStrategies(enabled = true) {
  return useQuery({ ...mcStrategiesQueryOptions, enabled })
}

export function useMcTickerInfo(symbol: string) {
  const s = symbol.trim().toUpperCase()
  return useQuery({
    queryKey: mcKeys.ticker(s),
    queryFn: () => fetchMcTickerInfo(s),
    enabled: s.length > 0,
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
}

/** Poll interval for a run: every 2 s while queued or running, otherwise stop. */
export function runRefetchInterval(run: McRun | undefined): number | false {
  return run && isActiveStatus(run.status) ? POLL_MS : false
}

export function useMcRun(id: string | null) {
  return useQuery({
    queryKey: mcKeys.run(id ?? ''),
    queryFn: () => fetchMcRun(id as string),
    enabled: !!id,
    refetchInterval: (q) => runRefetchInterval(q.state.data),
    staleTime: (q) => (q.state.data && !isActiveStatus(q.state.data.status) ? Infinity : 0),
  })
}

export function useMcRuns(enabled = true) {
  return useQuery({
    queryKey: mcKeys.runs,
    queryFn: fetchMcRuns,
    enabled,
    refetchInterval: (q) => (q.state.data?.some((r) => isActiveStatus(r.status)) ? 5000 : false),
  })
}

export function useCreateMcRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMcRun,
    onSuccess: (run) => {
      qc.setQueryData(mcKeys.run(run.id), run)
      qc.invalidateQueries({ queryKey: mcKeys.runs })
    },
  })
}
