import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Dices, History, Loader2, Lock, Play } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import {
  McApiError,
  mcKeys,
  useCreateMcRun,
  useMcRun,
  useMcRuns,
  useMcStrategies,
  useMcTickerInfo,
  type McFamily,
  type McMode,
  type McModeAResult,
  type McModeBResult,
  type McRun,
  type McRunRequest,
} from '../../lib/monte-carlo'
import { approxBars, estimateSeconds, fmtDuration, fmtR, fmtShare, isActiveStatus } from '../../lib/monte-carlo-utils'
import { TickerAutocomplete } from '../../components/TickerAutocomplete'
import { ModeAResults, ModeBResults, RunFailed, RunHeader, RunProgress } from '../../components/MonteCarloResults'

export const Route = createFileRoute('/(home)/monte-carlo')({
  validateSearch: (search: Record<string, unknown>) => ({
    run: typeof search.run === 'string' ? search.run : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Monte Carlo | FoxelSignal' },
      {
        name: 'description',
        content: 'Stress-test a strategy on a ticker: the range of outcomes its trades could produce, and how robust its edge is to the exact price history.',
      },
    ],
  }),
  component: MonteCarloPage,
})

const FAMILY_LABEL: Record<McFamily, string> = {
  trend: 'Trend',
  mean_reversion: 'Mean reversion',
  price_action: 'Price action',
}
const MODE_TEXT: Record<McMode, { label: string; hint: string }> = {
  trades: { label: 'Trade reshuffle', hint: 'Redraws the backtest’s trades at random. Answers in about a second.' },
  paths: { label: 'Synthetic prices', hint: 'Re-runs the strategy on reshuffled price history. Runs in the background.' },
}
const DEFAULT_STRATEGY = 'MR-A2'

interface FormState {
  ticker: string
  strategy: string
  mode: McMode
  nSims: number | null // null = the mode's default
  horizon: string
  riskPct: string
  startEquity: string
  years: number
  blockLen: number
  ddThreshold: string
  seed: string
}

const INITIAL_FORM: FormState = {
  ticker: '',
  strategy: DEFAULT_STRATEGY,
  mode: 'trades',
  nSims: null,
  horizon: '',
  riskPct: '1',
  startEquity: '100000',
  years: 5,
  blockLen: 20,
  ddThreshold: '30',
  seed: '',
}

const inputCls =
  'w-full px-3 py-2 bg-brand-bg/30 border border-brand-border rounded-lg text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-3 focus:ring-brand-primary/15 transition-all'
const labelCls = 'block text-[11px] font-medium text-gray-500 mb-1'

function num(s: string): number | undefined {
  const v = Number(s.replace(/,/g, ''))
  return s.trim() === '' || Number.isNaN(v) ? undefined : v
}

function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-lg border border-brand-border overflow-hidden" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-2 py-2 text-[11px] font-mono font-bold transition-colors cursor-pointer border-r last:border-r-0 border-brand-border ${
            value === o.value ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 hover:text-brand-dark hover:bg-brand-bg/50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`).getTime()
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

function headlineText(run: McRun): string {
  const h = run.headline
  if (run.status === 'failed') return 'Failed'
  if (isActiveStatus(run.status)) return `${run.status === 'queued' ? 'Queued' : 'Running'} ${run.progress.done}/${run.progress.total}`
  if (!h) return ''
  return run.mode === 'trades'
    ? `Median ${fmtR(h.median_total_r ?? null, 1)} · ${fmtShare(h.prob_negative ?? null, 0)} negative`
    : `${fmtShare(h.share_pass_gate ?? null, 0)} pass gate · median ${fmtR(h.median_expectancy_r ?? null, 2)}`
}

function MonteCarloPage() {
  const navigate = useNavigate({ from: '/monte-carlo' })
  const { run: runId } = Route.useSearch()
  const queryClient = useQueryClient()
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const strategiesQ = useMcStrategies(isAuthenticated)
  const tickerQ = useMcTickerInfo(isAuthenticated ? form.ticker : '')
  const runsQ = useMcRuns(isAuthenticated)
  const runQ = useMcRun(isAuthenticated ? runId ?? null : null)
  const createRun = useCreateMcRun()

  // Route protection (same as Watchlist / Profile)
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: '/monte-carlo' } })
    }
  }, [isAuthLoading, isAuthenticated, navigate])

  // When a background run finishes, refresh the Recent runs list
  const prevStatus = useRef<string | undefined>(undefined)
  useEffect(() => {
    const st = runQ.data?.status
    if (prevStatus.current && isActiveStatus(prevStatus.current) && st && !isActiveStatus(st)) {
      queryClient.invalidateQueries({ queryKey: mcKeys.runs })
    }
    prevStatus.current = st
  }, [runQ.data?.status, queryClient])

  const cfg = strategiesQ.data
  const strategies = cfg?.strategies ?? []
  const strategy = strategies.find((s) => s.key === form.strategy)
  const grouped = useMemo(() => {
    const g: Partial<Record<McFamily, typeof strategies>> = {}
    for (const s of strategies) (g[s.family] ??= []).push(s)
    return g
  }, [strategies])

  const nSims = form.nSims ?? (form.mode === 'trades' ? cfg?.defaults.n_sims_trades ?? 1000 : cfg?.defaults.n_sims_paths ?? 100)
  const simOptions = (form.mode === 'trades' ? cfg?.limits.mode_a_n_sims : cfg?.limits.mode_b_n_paths) ?? [100, 250, 500, 1000]
  const d8Warning = tickerQ.data?.warnings?.[form.strategy] ?? null
  const estimate =
    form.mode === 'paths' && strategy && cfg
      ? estimateSeconds(strategy.est_seconds_per_path_per_1000_bars, approxBars(form.years, tickerQ.data?.kind), nSims, cfg.worker_processes)
      : undefined

  const activeRun = runsQ.data?.find((r) => r.mode === 'paths' && isActiveStatus(r.status))

  const submit = async () => {
    setFormError(null)
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker) {
      setFormError('Enter a ticker.')
      return
    }
    const body: McRunRequest = {
      ticker,
      strategy: form.strategy,
      mode: form.mode,
      n_sims: nSims,
      years: form.years,
      dd_threshold_pct: num(form.ddThreshold),
      seed: num(form.seed) ?? null,
    }
    if (form.mode === 'trades') {
      body.horizon_trades = num(form.horizon) ?? null
      body.risk_pct = num(form.riskPct)
      body.start_equity = num(form.startEquity)
    } else {
      body.block_len = form.blockLen
    }
    try {
      const run = await createRun.mutateAsync(body)
      navigate({ search: { run: run.id } })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    }
  }

  const reuse = (run: McRun) => {
    const p = run.params
    setForm({
      ticker: run.ticker,
      strategy: run.strategy,
      mode: run.mode,
      nSims: (run.mode === 'trades' ? p.n_sims : p.n_paths) ?? null,
      horizon: p.horizon_trades ? String(p.horizon_trades) : '',
      riskPct: p.risk_pct !== undefined && p.risk_pct !== null ? String(p.risk_pct) : INITIAL_FORM.riskPct,
      startEquity: p.start_equity ? String(p.start_equity) : INITIAL_FORM.startEquity,
      years: run.years,
      blockLen: p.block_len ?? INITIAL_FORM.blockLen,
      ddThreshold: p.dd_threshold_pct ? String(p.dd_threshold_pct) : INITIAL_FORM.ddThreshold,
      seed: String(run.seed),
    })
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center animate-pulse mb-4">
          <Lock className="w-6 h-6 text-brand-primary" />
        </div>
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Authenticating session...</p>
      </div>
    )
  }
  if (!user) return null

  const run = runQ.data
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10 animate-fade-in">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono font-semibold mb-2">
          <Dices className="w-3.5 h-3.5" />
          <span>Strategy Stress Test</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-display text-brand-dark tracking-tight">Monte Carlo Simulator</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
          One backtest is one history. See the range of outcomes a strategy could have produced on a ticker — and whether its edge survives a different price path.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] gap-6 items-start">
        {/* ── Input panel (left on desktop, top on mobile) ─────────── */}
          <form
            className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 lg:col-start-1 lg:row-start-1"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div>
              <label className={labelCls} htmlFor="mc-ticker">Ticker</label>
              <TickerAutocomplete
                id="mc-ticker"
                value={form.ticker}
                onChange={(v) => set('ticker', v)}
                onSelectTicker={(s) => set('ticker', s)}
                placeholder="e.g. AAPL, SPY, BTCUSD"
                inputClassName="w-full pl-10 pr-9 py-2 bg-brand-bg/30 border border-brand-border rounded-lg text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all uppercase"
              />
              {tickerQ.data && (
                <p className="text-[10px] font-mono text-gray-400 mt-1">
                  {tickerQ.data.name ?? tickerQ.data.ticker} · {tickerQ.data.kind.replace('_', ' ')}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="mc-strategy">Strategy</label>
              <select id="mc-strategy" className={`${inputCls} cursor-pointer`} value={form.strategy} onChange={(e) => set('strategy', e.target.value)} disabled={!strategies.length}>
                {!strategies.length && <option>Loading…</option>}
                {(Object.keys(FAMILY_LABEL) as McFamily[]).map((fam) =>
                  grouped[fam]?.length ? (
                    <optgroup key={fam} label={FAMILY_LABEL[fam]}>
                      {grouped[fam]!.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.display}
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
              </select>
              {d8Warning && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                  <span>{d8Warning}</span>
                </div>
              )}
            </div>

            <div>
              <span className={labelCls}>Mode</span>
              <Segmented
                label="Mode"
                value={form.mode}
                onChange={(m) => setForm((f) => ({ ...f, mode: m, nSims: null }))}
                options={(['trades', 'paths'] as const).map((m) => ({ value: m, label: MODE_TEXT[m].label }))}
              />
              <p className="text-[10px] text-gray-500 mt-1">{MODE_TEXT[form.mode].hint}</p>
            </div>

            <div>
              <span className={labelCls}>{form.mode === 'trades' ? 'Simulations' : 'Synthetic paths'}</span>
              <Segmented label="Number of simulations" value={nSims} onChange={(v) => set('nSims', v)} options={simOptions.map((n) => ({ value: n, label: n.toLocaleString('en-US') }))} />
            </div>

            {form.mode === 'trades' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="mc-risk">Risk per trade %</label>
                    <input id="mc-risk" className={inputCls} inputMode="decimal" value={form.riskPct} onChange={(e) => set('riskPct', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="mc-equity">Starting equity $</label>
                    <input id="mc-equity" className={inputCls} inputMode="numeric" value={form.startEquity} onChange={(e) => set('startEquity', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="mc-horizon">Trades per simulation</label>
                  <input id="mc-horizon" className={inputCls} inputMode="numeric" placeholder="Same as the backtest" value={form.horizon} onChange={(e) => set('horizon', e.target.value)} />
                </div>
              </>
            )}

            <details className="group">
              <summary className="cursor-pointer text-[11px] font-mono font-bold text-gray-500 hover:text-brand-primary select-none">Advanced</summary>
              <div className="space-y-3 mt-3">
                <div>
                  <span className={labelCls}>History</span>
                  <Segmented label="History window" value={form.years} onChange={(v) => set('years', v)} options={(cfg?.limits.years ?? [3, 5, 10]).map((y) => ({ value: y, label: `${y} years` }))} />
                </div>
                {form.mode === 'paths' && (
                  <div>
                    <label className={labelCls} htmlFor="mc-block">
                      Average block length: <span className="font-mono text-brand-dark">{form.blockLen} days</span>
                    </label>
                    <input id="mc-block" type="range" min={cfg?.limits.block_len[0] ?? 5} max={cfg?.limits.block_len[1] ?? 60} step={1} value={form.blockLen} onChange={(e) => set('blockLen', Number(e.target.value))} className="w-full accent-brand-primary" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {form.mode === 'trades' && (
                    <div>
                      <label className={labelCls} htmlFor="mc-dd">Drawdown threshold %</label>
                      <input id="mc-dd" className={inputCls} inputMode="decimal" value={form.ddThreshold} onChange={(e) => set('ddThreshold', e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls} htmlFor="mc-seed">Seed</label>
                    <input id="mc-seed" className={inputCls} inputMode="numeric" placeholder="Random" value={form.seed} onChange={(e) => set('seed', e.target.value)} />
                  </div>
                </div>
              </div>
            </details>

            {estimate !== undefined && (
              <p className="text-[11px] text-gray-500 font-mono">Estimated time: {fmtDuration(estimate)}</p>
            )}

            <button
              type="submit"
              disabled={createRun.isPending || !form.ticker.trim() || !strategies.length}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors rounded-[14px] text-xs font-mono font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_18px_rgba(249,115,22,0.25)]"
            >
              {createRun.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{form.mode === 'trades' ? 'Simulating…' : 'Queuing…'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run simulation</span>
                </>
              )}
            </button>

            {formError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{formError}</p>
                  {activeRun && createRun.error instanceof McApiError && createRun.error.status === 409 && (
                    <button type="button" className="mt-1 underline font-semibold cursor-pointer" onClick={() => navigate({ search: { run: activeRun.id } })}>
                      Open the run in progress
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>

        {/* ── Results (right on desktop, under the form on mobile) ──── */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          {!runId ? (
            <EmptyState />
          ) : runQ.isLoading ? (
            <div className="bg-white border border-brand-border rounded-2xl p-12 text-center shadow-xs">
              <Loader2 className="w-7 h-7 text-brand-primary animate-spin mx-auto" />
            </div>
          ) : runQ.isError || !run ? (
            <div className="bg-white border border-brand-border rounded-2xl p-8 text-center shadow-xs text-xs text-gray-500">
              {runQ.error instanceof Error ? runQ.error.message : 'Run not found.'}
            </div>
          ) : (
            <div>
              <RunHeader run={run} onReuse={() => reuse(run)} />
              {isActiveStatus(run.status) ? (
                <RunProgress run={run} estimateSeconds={run.estimate_seconds ?? (run.mode === 'paths' && strategy && cfg ? estimateSeconds(strategy.est_seconds_per_path_per_1000_bars, approxBars(run.years), run.progress.total, cfg.worker_processes) : undefined)} />
              ) : run.status === 'failed' ? (
                <RunFailed run={run} />
              ) : run.result?.mode === 'trades' ? (
                <ModeAResults run={run} result={run.result as McModeAResult} />
              ) : run.result?.mode === 'paths' ? (
                <ModeBResults result={run.result as McModeBResult} />
              ) : null}
            </div>
          )}
        
        </div>

          {/* Recent runs (under the form on desktop, last on mobile) */}
          <div className="bg-white border border-brand-border rounded-2xl shadow-xs lg:col-start-1 lg:row-start-2">
            <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-brand-dark">Recent runs</h2>
            </div>
            {runsQ.isLoading ? (
              <p className="px-4 py-4 text-[11px] text-gray-400 font-mono">Loading…</p>
            ) : !runsQ.data?.length ? (
              <p className="px-4 py-4 text-[11px] text-gray-500">Your runs will appear here for 30 days.</p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto divide-y divide-brand-border">
                {runsQ.data.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ search: { run: r.id } })}
                      className={`w-full text-left px-4 py-2.5 hover:bg-brand-bg/50 transition-colors cursor-pointer ${r.id === runId ? 'bg-brand-primary/5' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-brand-dark whitespace-nowrap">
                          {r.ticker} <span className="font-sans font-medium text-gray-600">{r.strategy_display}</span>
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">{timeAgo(r.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{MODE_TEXT[r.mode].label}</span>
                        <span className={`text-[11px] font-mono ${r.status === 'failed' ? 'text-rose-600' : 'text-gray-600'}`}>{headlineText(r)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs">
      <h2 className="text-base font-bold font-display text-brand-dark mb-1">How it works</h2>
      <p className="text-xs text-gray-500 mb-5">Both modes start from the strategy’s real backtest on the ticker’s daily history, then answer different questions.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-brand-border p-4 bg-brand-bg/30">
          <p className="text-xs font-bold text-brand-dark">Trade reshuffle</p>
          <p className="text-[11px] text-gray-600 mt-1 leading-5">
            “Given these trades, how good or bad could the next run of trades be?” Draws the backtest’s trades at random, thousands of times, and shows the range of total R, equity, drawdown and losing streaks. Needs at least 10 trades.
          </p>
        </div>
        <div className="rounded-xl border border-brand-border p-4 bg-brand-bg/30">
          <p className="text-xs font-bold text-brand-dark">Synthetic prices</p>
          <p className="text-[11px] text-gray-600 mt-1 leading-5">
            “Is the edge robust, or did it depend on the exact price history?” Stitches together random blocks of real daily bars into new histories and re-runs the strategy on each. Shows how often it clears PF 1.5 and 0.2R, and where the real result ranks.
          </p>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-5">Results describe the past. They are not a forecast or investment advice.</p>
    </div>
  )
}
