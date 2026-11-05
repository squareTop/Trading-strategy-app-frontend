// 2026-11-05 (Build Spec Phase 4, item 4.4): the Promotion page. The newest weekly
// promotion review (GET /api/promotion): one row per strategy version and direction
// with its stage, the job's recommendation and the evidence behind it (forward
// against backtest net R with 95% ranges, fidelity, the replay), plus the version's
// stage history. Every figure is the job's own: nothing is calculated here, so the
// Phase 4 hand check holds on the page. The review recommends; a stage moves only
// when Andrew runs stage_admin, citing the review row's id. No login, like the
// scoreboard.
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Fragment, useState } from 'react'
import { API_URL } from '../../lib/config'

type Num = number | null

interface Check { name: string; met: boolean; detail: string }
export interface PromotionRow {
  id: number
  review_date: string
  week: string
  strategy: string
  version: number
  strategy_version: string
  direction: 'long' | 'short' | 'all'
  stage: string | null
  go_live: string | null
  bt_asof: string | null
  bt_period: string | null
  bt_trades: number | null
  bt_mean_r: Num
  bt_mean_r_lo: Num
  bt_mean_r_hi: Num
  bt_random_excess: Num
  fwd_trades: number
  fwd_open: number | null
  fwd_mean_r: Num
  fwd_mean_r_lo: Num
  fwd_mean_r_hi: Num
  fwd_se: Num
  fwd_win_rate: Num
  fwd_pf: Num
  fwd_pf_no_losses: boolean
  fwd_sessions: number | null
  recent_trades: number | null
  recent_mean_r: Num
  recent_vs_backtest: 'inside' | 'below' | 'above' | null
  fid_sessions: number | null
  fid_window_start: string | null
  fid_window_end: string | null
  fid_failed_sessions: number | null
  fid_unexplained: number | null
  fid_clean: boolean
  replay_checked: number | null
  replay_matched: number | null
  ideas_strategy: number | null
  ideas_total: number | null
  hypothesis_id: string | null
  archive_condition: string | null
  recommendation: 'promote' | 'hold' | 'demote' | 'archive' | 'report'
  to_stage: string | null
  reasons: string[] | null
  checks: Check[] | null
  detail: { failed_sessions?: string[]; unexplained_rows?: [string, string][]; replay_mismatched_ids?: number[] } | null
}
interface HistoryRow {
  id: number; strategy_version: string; direction: string; kind: string; from_stage: string | null
  to_stage: string; effective_from: string; reason: string; decided_by: string; review_id: number | null
}
export interface PromotionResponse {
  week: string | null
  review_date: string | null
  rows: PromotionRow[]
  history: HistoryRow[]
  thresholds: Record<string, number | string>
}

const promotionQueryOptions = queryOptions({
  queryKey: ['promotion'],
  queryFn: async () => {
    const response = await fetch(`${API_URL}/api/promotion`)
    if (!response.ok) throw new Error(`Failed to fetch the promotion review: error status ${response.status}`)
    return response.json() as Promise<PromotionResponse>
  },
  staleTime: 60 * 1000,
})

export const Route = createFileRoute('/(home)/promotion')({
  head: () => ({
    meta: [
      { title: 'Promotion Review | FoxelSignal' },
      { name: 'description', content: 'Weekly promotion review: each strategy version’s forward results against its backtest, fidelity and the recommendation.' },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(promotionQueryOptions).catch(() => { })
  },
  component: PromotionPage,
})

const REC_STYLE: Record<PromotionRow['recommendation'], string> = {
  promote: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  hold: 'bg-gray-50 text-gray-700 border-gray-300',
  demote: 'bg-amber-50 text-amber-800 border-amber-300',
  archive: 'bg-red-50 text-red-800 border-red-300',
  report: 'bg-white text-gray-500 border-gray-200 border-dashed',
}

function fmtR(x: Num, digits = 3): string {
  return x === null || x === undefined ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(digits)}`
}

function Range({ mean, lo, hi }: { mean: Num; lo: Num; hi: Num }) {
  if (mean === null || mean === undefined) return <span className="text-gray-400">—</span>
  const tone = lo !== null && lo > 0 ? 'text-emerald-700' : hi !== null && hi < 0 ? 'text-red-700' : 'text-brand-dark'
  return (
    <span className={tone}>
      {fmtR(mean)} R
      {lo !== null && hi !== null && <span className="block text-[10px] text-gray-500 whitespace-nowrap">[{fmtR(lo)}, {fmtR(hi)}]</span>}
    </span>
  )
}

function recLabel(r: PromotionRow): string {
  if (r.recommendation === 'report') return 'Report only'
  if (r.recommendation === 'hold') return 'Hold'
  return `${r.recommendation[0].toUpperCase()}${r.recommendation.slice(1)} → ${r.to_stage}`
}

function Detail({ r, history }: { r: PromotionRow; history: HistoryRow[] }) {
  const mine = history.filter((h) => h.strategy_version === r.strategy_version && (r.direction === 'all' || h.direction === r.direction))
  return (
    <div className="grid gap-4 md:grid-cols-2 text-xs text-gray-700 p-4 bg-brand-bg/40 font-sans">
      <div>
        <p className="font-bold text-brand-dark mb-1">Why</p>
        <ul className="space-y-0.5 list-disc pl-4">
          {(r.reasons || []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
        {r.checks && r.checks.length > 0 && (
          <>
            <p className="font-bold text-brand-dark mt-3 mb-1">Checks</p>
            <ul className="space-y-0.5">
              {r.checks.map((c) => (
                <li key={c.name}>
                  <span className={c.met ? 'text-emerald-700' : 'text-gray-400'}>{c.met ? '✓' : '✗'}</span> {c.detail}
                </li>
              ))}
            </ul>
          </>
        )}
        {(r.detail?.failed_sessions?.length || r.detail?.unexplained_rows?.length || r.detail?.replay_mismatched_ids?.length) ? (
          <>
            <p className="font-bold text-brand-dark mt-3 mb-1">To look at</p>
            <ul className="space-y-0.5">
              {r.detail?.failed_sessions?.length ? <li>Sessions with no fidelity check: {r.detail.failed_sessions.join(', ')}</li> : null}
              {r.detail?.unexplained_rows?.length ? <li>Unexplained fidelity rows: {r.detail.unexplained_rows.map(([d, why]) => `${d} ${why}`).join('; ')}</li> : null}
              {r.detail?.replay_mismatched_ids?.length ? (
                <li>Replay differs from the log:{' '}
                  {r.detail.replay_mismatched_ids.map((id, i) => (
                    <Fragment key={id}>{i ? ', ' : ''}<Link to="/trade/$id" params={{ id: String(id) }} className="text-brand-primary hover:underline">#{id}</Link></Fragment>
                  ))}
                </li>
              ) : null}
            </ul>
          </>
        ) : null}
      </div>
      <div>
        <p className="font-bold text-brand-dark mb-1">Hypothesis {r.hypothesis_id || ''}</p>
        <p>Archive condition (judged by you, not tested by the job): {r.archive_condition || '—'}</p>
        <p className="mt-1">Ideas tried: {r.ideas_strategy ?? '—'} for {r.strategy}, {r.ideas_total ?? '—'} in the whole log.</p>
        <p className="mt-1">Backtest: {r.bt_period || '—'}{r.bt_trades ? `, ${r.bt_trades.toLocaleString()} trades` : ''}{r.bt_asof ? `, statistics as of ${r.bt_asof}` : ''}{r.bt_random_excess !== null ? `; random-entry excess ${fmtR(r.bt_random_excess)} R` : ''}.</p>
        <p className="mt-1">Forward: {r.fwd_sessions ?? 0} trading days since go-live ({r.go_live || '—'}); win rate {r.fwd_win_rate === null ? '—' : `${(r.fwd_win_rate * 100).toFixed(0)}%`}; PF {r.fwd_pf_no_losses ? 'no losses' : r.fwd_pf === null ? '—' : r.fwd_pf.toFixed(2)} (information only).</p>
        {r.direction !== 'all' && <p className="mt-1 font-mono text-[11px] text-gray-500">Review row id {r.id} (stage_admin --review-id {r.id})</p>}
        <p className="font-bold text-brand-dark mt-3 mb-1">Stage history</p>
        {mine.length === 0 ? <p>None recorded.</p> : (
          <ul className="space-y-0.5">
            {mine.map((h) => (
              <li key={h.id}>
                <span className="font-mono">{h.effective_from}</span> {h.direction}: {h.from_stage ? `${h.from_stage} → ` : ''}{h.to_stage} ({h.kind}), {h.reason} · {h.decided_by}
                {h.review_id ? ` · review ${h.review_id}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PromotionPage() {
  const { data, isLoading, error, refetch } = useQuery(promotionQueryOptions)
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const th = data?.thresholds || {}

  return (
    <div className="min-h-[calc(100vh-61px)] bg-brand-bg font-sans pb-12 flex flex-col">
      <main className="max-w-360 w-full mx-auto px-4 md:px-8 mt-8 flex-1 flex flex-col gap-6">
        <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs">
          <p className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider">Promotion review</p>
          <h1 className="font-display text-3xl font-extrabold text-brand-dark tracking-tight mt-1">Where each strategy version stands</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">
            Every Saturday after the weekly run, the review compares each version’s forward results with its backtest,
            checks fidelity and replays the resolved trades, and recommends promote, hold, demote or archive. It never
            changes a stage: that is your call, made with stage_admin.
          </p>
          {data?.week && <p className="text-xs font-mono text-gray-500 mt-3">Review {data.week} · run {data.review_date}</p>}
        </div>

        {isLoading && (
          <div className="bg-white border border-brand-border rounded-xl p-16 flex flex-col items-center justify-center shadow-xs">
            <div className="w-12 h-12 rounded-full border-4 border-brand-bg border-t-brand-primary animate-spin mb-4"></div>
            <p className="font-display text-lg font-bold text-brand-dark">Loading the review…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 shadow-xs">
            <h4 className="font-display text-base font-bold text-red-950">Promotion review unavailable</h4>
            <p className="text-sm mt-1">{(error as Error).message}</p>
            <button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Retry</button>
          </div>
        )}

        {!isLoading && !error && data && data.rows.length === 0 && (
          <div className="bg-white border border-brand-border rounded-xl p-8 text-sm text-gray-600 shadow-xs">
            No review yet. The first one runs on Saturday at 08:30 SGT, after the weekly run.
          </div>
        )}

        {!isLoading && !error && data && data.rows.length > 0 && (
          <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono min-w-[1100px]">
              <thead>
                <tr className="border-b border-brand-border text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Recommendation</th>
                  <th className="py-3 px-4 text-right">Forward trades</th>
                  <th className="py-3 px-4 text-right" title="Mean net R of the resolved forward trades, with its 95% range">Forward mean R</th>
                  <th className="py-3 px-4 text-right" title="Backtest mean net R, confirmation period, with its 95% range">Backtest mean R</th>
                  <th className="py-3 px-4 text-right" title="Forward trades signalled in the last 91 days, against the backtest range">Last 3 months</th>
                  <th className="py-3 px-4 text-right" title="Last 20 due sessions: sessions with no check, unexplained rows">Fidelity</th>
                  <th className="py-3 px-4 text-right" title="Resolved forward trades the simulator replays to the same result">Replay</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className={`border-b border-brand-border/60 ${r.direction === 'all' ? 'bg-brand-bg/30 text-gray-500' : ''}`}>
                      <td className="py-3 px-4">
                        <span className="font-bold text-brand-dark">{r.strategy_version}</span>
                        <span className={`ml-2 uppercase text-[10px] font-bold ${r.direction === 'long' ? 'text-emerald-700' : r.direction === 'short' ? 'text-red-700' : 'text-gray-500'}`}>{r.direction}</span>
                      </td>
                      <td className="py-3 px-4">{r.stage ? <span className="uppercase text-[10px] border rounded px-1.5 py-0.5 border-gray-300">{r.stage}</span> : '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex uppercase text-[10px] font-bold border rounded px-2 py-0.5 ${REC_STYLE[r.recommendation]}`}>{recLabel(r)}</span>
                        {r.reasons && r.reasons[0] && r.direction !== 'all' && <span className="block text-[10px] text-gray-500 mt-1 font-sans max-w-xs">{r.reasons[1] || r.reasons[0]}</span>}
                      </td>
                      <td className="py-3 px-4 text-right">{r.fwd_trades}{r.fwd_open ? <span className="block text-[10px] text-gray-500">{r.fwd_open} open</span> : null}</td>
                      <td className="py-3 px-4 text-right"><Range mean={r.fwd_mean_r} lo={r.fwd_mean_r_lo} hi={r.fwd_mean_r_hi} /></td>
                      <td className="py-3 px-4 text-right"><Range mean={r.bt_mean_r} lo={r.bt_mean_r_lo} hi={r.bt_mean_r_hi} /></td>
                      <td className="py-3 px-4 text-right">
                        {r.recent_trades ? <>{fmtR(r.recent_mean_r)} R<span className="block text-[10px] text-gray-500">{r.recent_trades} trades{r.recent_vs_backtest ? `, ${r.recent_vs_backtest}` : ''}</span></> : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={r.fid_clean ? 'text-emerald-700' : 'text-amber-700'}>{r.fid_clean ? 'clean' : 'check'}</span>
                        <span className="block text-[10px] text-gray-500">{r.fid_sessions ?? 0} sessions · {r.fid_failed_sessions ?? 0} missed · {r.fid_unexplained ?? 0} unexpl.</span>
                      </td>
                      <td className="py-3 px-4 text-right">{r.replay_checked ? `${r.replay_matched} / ${r.replay_checked}` : '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))} className="text-brand-primary hover:underline text-[11px]">
                          {open[r.id] ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {open[r.id] && (
                      <tr className="border-b border-brand-border/60">
                        <td colSpan={10} className="p-0"><Detail r={r} history={data.history} /></td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="bg-white border border-brand-border rounded-xl p-4 shadow-xs text-xs text-gray-600 grid gap-2 md:grid-cols-2">
            <div>
              <p className="font-bold text-brand-dark mb-1">The rules</p>
              <ul className="space-y-0.5 list-disc pl-4">
                <li>Shadow → forward: {th.shadow_to_forward_trades ?? 30} resolved trades, fidelity clean, forward mean at least the backtest mean minus {th.se_mult ?? 2} standard errors.</li>
                <li>Forward → shadow: after {th.demote_trades ?? 50} trades, the forward range wholly below 0.</li>
                <li>Archive: after {th.archive_trades ?? 100} trades, the forward range wholly below 0 (or the hypothesis’s own condition, which you judge).</li>
                <li>Forward → paper: {th.paper_trades ?? 300} trades over {th.paper_sessions ?? 60} trading days, range above 0, fidelity clean over {th.fidelity_sessions ?? 20} sessions, every trade replays the same. Paper orders come with Phase 5.</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-brand-dark mb-1">Reading the figures</p>
              <ul className="space-y-0.5 list-disc pl-4">
                <li>Mean R is net of costs, per trade, on the initial risk; the bracket is its 95% range.</li>
                <li>Backtest: the {th.confirm_period ?? '2021-Jun 2026'} confirmation period of the weekly statistics.</li>
                <li>Profit factor is shown in the details for information only; it does not decide anything.</li>
                <li>The “all” rows report both directions together; stages are kept per direction.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
