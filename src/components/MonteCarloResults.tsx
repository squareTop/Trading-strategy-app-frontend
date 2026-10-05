import { useState } from 'react'
import { AlertTriangle, Info, Loader2, XCircle } from 'lucide-react'
import type { McBase, McModeAResult, McModeBResult, McRun, McScannerFigures } from '#/lib/monte-carlo'
import { fmtDuration, fmtMoney, fmtOrdinal, fmtPct, fmtPF, fmtR, fmtShare } from '#/lib/monte-carlo-utils'
import { FanChart } from './FanChart'
import { Histogram } from './Histogram'

/**
 * Result panels for the Monte Carlo page. Pure props, no data fetching —
 * the route (routes/(home)/monte-carlo.tsx) decides which one to show.
 */

const SMALL_SAMPLE = 30
const MODE_LABEL = { trades: 'Trade reshuffle', paths: 'Synthetic prices' } as const

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-brand-border rounded-2xl shadow-xs ${className}`}>{children}</div>
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold font-display text-brand-dark">{children}</h3>
      {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )
}

export function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-brand-border rounded-xl p-3.5">
      <p className="text-[11px] text-gray-500 leading-4">{label}</p>
      <p className="text-xl font-semibold font-display text-brand-dark mt-1 leading-7">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 font-mono mt-0.5 leading-4">{sub}</p>}
    </div>
  )
}

// ── header, warnings, note ──────────────────────────────────────────────────
export function RunHeader({ run, onReuse }: { run: McRun; onReuse?: () => void }) {
  const n = run.mode === 'trades' ? run.params.n_sims : run.params.n_paths
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black font-display text-brand-dark tracking-tight">{run.ticker}</h2>
          <span className="text-sm font-semibold text-brand-dark">{run.strategy_display}</span>
          <span className="px-2 py-0.5 rounded-md bg-brand-bg border border-brand-border text-[10px] font-mono font-bold uppercase tracking-wider text-gray-600">
            {MODE_LABEL[run.mode]}
          </span>
          {run.cached && (
            <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[10px] font-mono font-bold uppercase tracking-wider text-sky-700" title="An identical earlier run on the same data was reused">
              Reused
            </span>
          )}
        </div>
        <p className="text-[11px] font-mono text-gray-500 mt-1">
          {n?.toLocaleString('en-US')} {run.mode === 'trades' ? 'simulations' : 'synthetic paths'} · {run.years} years of daily data to {run.data_asof} · seed {run.seed}
        </p>
      </div>
      {onReuse && (
        <button
          type="button"
          onClick={onReuse}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-brand-border bg-white hover:border-brand-dark text-[11px] font-mono font-bold text-brand-dark transition-all cursor-pointer"
          title="Fill the form with this run's settings and seed, to reproduce or tweak it"
        >
          Use these settings
        </button>
      )}
    </div>
  )
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null
  return (
    <div className="space-y-2 mb-4">
      {warnings.map((w) => (
        <div key={w} className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            <span className="sr-only">Warning: </span>
            {w}
          </span>
        </div>
      ))}
    </div>
  )
}

export function NotAForecast({ text }: { text: string }) {
  return (
    <p className="mt-5 flex items-center gap-1.5 text-[11px] text-gray-500">
      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden />
      {text}
    </p>
  )
}

// ── base backtest strip ─────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[88px]">
      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-brand-dark font-mono tabular-nums mt-0.5">{value}</p>
    </div>
  )
}

export function BaseStrip({ base, scanner, years, dataAsof, smallSampleText }: { base: McBase; scanner: McScannerFigures; years: number; dataAsof: string; smallSampleText?: string }) {
  const dirs = base.short > 0 ? `${base.long} long / ${base.short} short` : undefined
  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="text-xs font-bold text-brand-dark">Real backtest on this ticker</p>
        <p className="text-[11px] font-mono text-gray-500">
          {base.first_bar} → {base.last_bar ?? dataAsof} · {years} y
        </p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Stat label="Trades" value={`${base.trades}${dirs ? ` (${dirs})` : ''}`} />
        <Stat label="Win rate" value={fmtShare(base.win_rate)} />
        <Stat label="Profit factor" value={fmtPF(base.profit_factor)} />
        <Stat label="Expectancy" value={fmtR(base.expectancy_r, 3)} />
        <Stat label="Total" value={fmtR(base.total_r)} />
        <Stat label="Max drawdown" value={fmtR(-Math.abs(base.max_dd_r))} />
        <Stat label="Worst losing run" value={`${base.longest_losing_streak} trades`} />
      </div>
      <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-brand-border">
        <span className="font-semibold text-gray-600">Scanner figures</span> (the strategy engine's own definitions): {scanner.trades ?? '—'} trades · PF{' '}
        {fmtPF(scanner.profit_factor)} · expectancy {fmtR(scanner.expectancy_r, 3)}
        {scanner.note ? ` · fails the scanner's own validity gate (${scanner.note.replace(/_/g, ' ')})` : ''}
      </p>
      {base.trades < SMALL_SAMPLE && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>{smallSampleText ?? `Small sample: only ${base.trades} trades in the real backtest. Treat the ranges below as indicative.`}</span>
        </div>
      )}
    </Card>
  )
}

function splitWarnings(warnings: string[]) {
  const small = warnings.find((w) => w.startsWith('Small sample'))
  return { small, rest: warnings.filter((w) => w !== small) }
}

// ── Mode A ──────────────────────────────────────────────────────────────────
export function ModeAResults({ run, result }: { run: McRun; result: McModeAResult }) {
  const [unit, setUnit] = useState<'equity' | 'r'>('equity')
  const { small, rest } = splitWarnings(result.warnings)
  const k = result.kpis
  const p = result.percentiles
  const start = result.params.start_equity
  const comparable = result.horizon_trades_used === result.base.trades
  return (
    <div>
      <WarningList warnings={rest} />
      <BaseStrip base={result.base} scanner={result.scanner_figures} years={result.years} dataAsof={result.data_asof} smallSampleText={small} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <KpiTile label="Median total" value={fmtR(k.median_total_r)} sub={`5–95%: ${fmtR(k.total_r_p5)} to ${fmtR(k.total_r_p95)}`} />
        <KpiTile label="Median final equity" value={fmtMoney(p.final_equity.p50)} sub={`from ${fmtMoney(start)} at ${result.params.risk_pct}% risk`} />
        <KpiTile label="Chance of ending negative" value={fmtShare(k.prob_negative)} sub={`over ${result.horizon_trades_used} trades`} />
        <KpiTile label="Max drawdown" value={`${fmtPct(k.median_max_dd_pct)} median`} sub={`95th percentile ${fmtPct(k.p95_max_dd_pct)}`} />
        <KpiTile label={`Chance of a drawdown ≥ ${k.dd_threshold_pct}%`} value={fmtShare(k.prob_dd_breach)} />
        <KpiTile label="Longest losing streak" value={`${k.median_losing_streak ?? '—'} trades`} sub="median across simulations" />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionTitle hint={`${run.params.n_sims?.toLocaleString('en-US')} simulations of ${result.horizon_trades_used} trades, drawn at random from the backtest's trades.`}>
            {unit === 'equity' ? 'Equity by trade number' : 'Cumulative R by trade number'}
          </SectionTitle>
          <div className="inline-flex rounded-lg border border-brand-border overflow-hidden text-[11px] font-mono font-bold">
            {(['equity', 'r'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`px-2.5 py-1 cursor-pointer ${unit === u ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 hover:text-brand-dark'}`}
              >
                {u === 'equity' ? '$ Equity' : 'R'}
              </button>
            ))}
          </div>
        </div>
        {unit === 'equity' ? (
          <FanChart
            x={result.fan.x}
            bands={result.fan.equity}
            samples={result.sample_paths.equity}
            format={(v) => fmtMoney(v)}
            axisFormat={(v) => fmtMoney(v, true)}
            baseline={start}
            baselineLabel={`Start ${fmtMoney(start)}`}
            ariaLabel={`Fan chart of equity across ${result.horizon_trades_used} trades. Median final equity ${fmtMoney(p.final_equity.p50)}.`}
          />
        ) : (
          <FanChart
            x={result.fan.x}
            bands={result.fan.r}
            samples={result.sample_paths.r}
            format={(v) => fmtR(v, 1)}
            baseline={0}
            baselineLabel="0R"
            ariaLabel={`Fan chart of cumulative R across ${result.horizon_trades_used} trades. Median total ${fmtR(k.median_total_r)}.`}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle hint={comparable ? 'Orange line: the real backtest total.' : `Real backtest had ${result.base.trades} trades; each simulation uses ${result.horizon_trades_used}.`}>
            Total R across simulations
          </SectionTitle>
          <Histogram
            hist={result.histograms.total_r}
            format={(v) => fmtR(v, 0)}
            xLabel="Total R"
            markers={comparable ? [{ value: result.base.total_r, label: `Real ${fmtR(result.base.total_r, 1)}`, tone: 'real' }] : []}
            ariaLabel={`Histogram of total R. Median ${fmtR(k.median_total_r)}.`}
          />
        </Card>
        <Card className="p-4">
          <SectionTitle hint={`Dashed line: your ${k.dd_threshold_pct}% threshold.`}>Max drawdown across simulations</SectionTitle>
          <Histogram
            hist={result.histograms.max_dd_pct}
            format={(v) => `${v.toFixed(0)}%`}
            xLabel="Max drawdown (%)"
            markers={[{ value: k.dd_threshold_pct, label: `${k.dd_threshold_pct}% threshold`, tone: 'ref' }]}
            ariaLabel={`Histogram of max drawdown. Median ${fmtPct(k.median_max_dd_pct)}.`}
          />
        </Card>
      </div>
      <NotAForecast text={result.note} />
    </div>
  )
}

// ── Mode B ──────────────────────────────────────────────────────────────────
export function ModeBResults({ result }: { result: McModeBResult }) {
  const k = result.kpis
  const g = result.gate
  const real = result.real
  return (
    <div>
      <WarningList warnings={result.warnings} />
      <BaseStrip base={result.base} scanner={result.scanner_figures} years={result.years} dataAsof={result.data_asof} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <KpiTile label="Paths clearing the gate" value={fmtShare(k.share_pass_gate)} sub={`PF ≥ ${g.profit_factor} and expectancy ≥ ${g.expectancy_r}R`} />
        <KpiTile label="Median expectancy" value={fmtR(k.median_expectancy_r, 3)} sub={`5th percentile ${fmtR(k.p5_expectancy_r, 3)}`} />
        <KpiTile
          label="Where the real backtest ranks"
          value={`${fmtOrdinal(k.real_rank_expectancy)} pct`}
          sub="50th = typical; 90th+ = history was unusually kind"
        />
        <KpiTile label="Median profit factor" value={fmtPF(k.median_pf)} sub={`real backtest ${fmtPF(real.profit_factor)}`} />
        <KpiTile label="Trades per path" value={`${k.median_trades ?? '—'} median`} sub={`real backtest ${real.trades}`} />
        <KpiTile label="Paths with no trades" value={fmtShare(k.share_zero_trades)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle hint="Orange: the real backtest. Dashed: the PF 1.5 gate. Capped at 5 for display.">Profit factor across paths</SectionTitle>
          <Histogram
            hist={result.histograms.profit_factor}
            format={(v) => v.toFixed(1)}
            xLabel="Profit factor"
            unit="paths"
            markers={[
              ...(real.profit_factor !== null ? [{ value: Math.min(real.profit_factor, 5), label: `Real ${fmtPF(real.profit_factor)}`, tone: 'real' as const }] : []),
              { value: g.profit_factor, label: `Gate ${g.profit_factor}`, tone: 'ref' as const },
            ]}
            ariaLabel={`Histogram of profit factor across paths. Median ${fmtPF(k.median_pf)}.`}
          />
        </Card>
        <Card className="p-4">
          <SectionTitle hint="Orange: the real backtest. Dashed: the 0.2R gate.">Expectancy across paths</SectionTitle>
          <Histogram
            hist={result.histograms.expectancy_r}
            format={(v) => fmtR(v, 1)}
            xLabel="Expectancy (R per trade)"
            unit="paths"
            markers={[
              ...(real.expectancy_r !== null ? [{ value: real.expectancy_r, label: `Real ${fmtR(real.expectancy_r, 2)}`, tone: 'real' as const }] : []),
              { value: g.expectancy_r, label: `Gate ${fmtR(g.expectancy_r, 1)}`, tone: 'ref' as const },
            ]}
            ariaLabel={`Histogram of expectancy across paths. Median ${fmtR(k.median_expectancy_r, 3)}.`}
          />
        </Card>
      </div>
      <NotAForecast text={result.note} />
    </div>
  )
}

// ── queued / running / failed ───────────────────────────────────────────────
export function RunProgress({ run, estimateSeconds }: { run: McRun; estimateSeconds?: number }) {
  const { done, total } = run.progress
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const started = run.started_at ? new Date(run.started_at).getTime() : null
  const elapsed = started ? (Date.now() - started) / 1000 : 0
  const left = estimateSeconds !== undefined && run.status === 'running' ? Math.max(0, estimateSeconds - elapsed) : undefined
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Loader2 className="w-4 h-4 text-brand-primary animate-spin" aria-hidden />
        <p className="text-sm font-bold text-brand-dark">
          {run.status === 'queued' ? 'Waiting for the simulator…' : `Running ${run.ticker} · ${run.strategy_display}`}
        </p>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">
        {run.status === 'queued'
          ? 'Your run is in the queue and will start shortly. You can leave this page — it will be in Recent runs.'
          : 'Each synthetic path re-runs the full backtest. You can leave this page — it will be in Recent runs.'}
      </p>
      <div
        className="h-2.5 rounded-full bg-brand-bg border border-brand-border overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Paths simulated"
      >
        <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-2">
        <span>
          {done.toLocaleString('en-US')} / {total.toLocaleString('en-US')} paths ({pct}%)
        </span>
        {left !== undefined && <span>{left > 0 ? `${fmtDuration(left)} left` : 'finishing…'}</span>}
      </div>
    </Card>
  )
}

export function RunFailed({ run }: { run: McRun }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-2.5 text-rose-700">
        <XCircle className="w-5 h-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-bold">This run did not finish</p>
          <p className="text-xs mt-1 text-rose-600">{run.error ?? 'Unknown error.'}</p>
          <p className="text-[11px] mt-2 text-gray-500">Use these settings and run it again, or try fewer paths.</p>
        </div>
      </div>
    </Card>
  )
}
