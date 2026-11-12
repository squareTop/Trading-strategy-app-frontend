import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  COLOUR_CLASS, COLOUR_TEXT, STAGE_CLASS, VERDICT_LABEL, anchorOf,
  fmtDay, fmtNum, fmtR, fmtRange, fmtShare,
} from '#/lib/scoreboard'
import type { ScoreCardData } from '#/lib/types'
import { CumulativeRChart } from './CumulativeRChart'
import { MonthTable } from './MonthTable'

/**
 * 2026-11-12 (Scoreboard Rebuild): one card per strategy version and direction.
 * Answers "should I trust this strategy's next signal?": is it making money per
 * trade (mean net R with its 95% range), is that normal for it (against the
 * backtest's range, chart, months), how bad can it get (streak, drawdown), how
 * often and how long (signals a week, median hold), can I rely on it yet
 * (stage, live since, closed so far, open trades with unrealised R).
 * Every figure comes from the server; each has a one-line definition on hover.
 */

const VERDICT_CLASS: Record<string, string> = {
  too_few: 'bg-gray-100 text-gray-600 border-gray-300',
  inside: 'bg-gray-50 text-gray-700 border-gray-300',
  below: 'bg-red-50 text-red-800 border-red-300',
  above: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  no_backtest: 'bg-gray-100 text-gray-500 border-gray-300',
}

function Chip({ children, className, title }: { children: React.ReactNode; className: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  )
}

function Figure({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-brand-border/50 last:border-0" title={tip}>
      <dt className="text-[11px] font-mono uppercase tracking-wider text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm font-mono text-brand-dark text-right">{children}</dd>
    </div>
  )
}

export function ScoreCard({ card, tooltips = {}, minClosed = 30 }: { card: ScoreCardData; tooltips?: Record<string, string>; minClosed?: number }) {
  const [open, setOpen] = useState(false)
  const retired = card.section === 'retired'
  const ou = card.open_unrealised
  const bt = card.backtest
  const colourText = COLOUR_TEXT[card.colour]
  const dirClass = card.direction === 'long'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : card.direction === 'short' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-300'
  const stage = card.stage ?? 'no stage'

  return (
    <article id={card.anchor} className="bg-white border border-brand-border rounded-xl p-5 shadow-xs scroll-mt-24" aria-label={`${card.label} ${card.direction}`}>
      {/* header */}
      <header className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-brand-dark tracking-tight">{card.label}</h3>
          <Chip className={dirClass}>{card.direction === 'all' ? 'both' : card.direction}</Chip>
          <Chip className={STAGE_CLASS[stage] ?? STAGE_CLASS.retired} title={tooltips.stage}>{stage}</Chip>
          {card.style_display && <Chip className="bg-brand-bg text-gray-600 border-brand-border">{card.style_display}</Chip>}
        </div>
        {card.display_name && card.display_name !== card.strategy && (
          <p className="text-xs text-gray-500 mt-0.5">{card.display_name}</p>
        )}
        <p className="text-xs font-mono text-gray-600 mt-1" title={retired ? undefined : tooltips.live_since}>
          {retired ? (
            card.retired_on
              ? <>retired on {fmtDay(card.retired_on)}{card.retired_reason ? ` · ${card.retired_reason}` : ''}</>
              : <>retired · last signal {fmtDay(card.last_signal)}</>
          ) : (
            <>
              live since {fmtDay(card.go_live, card.asof)}
              {card.sessions_live !== null && <> · {card.sessions_live} trading days</>}
              <span title={tooltips.signals_per_week}> · {card.signals_per_week === null ? 'signals a week: after 5 days' : `${fmtNum(card.signals_per_week)} signals a week`}</span>
            </>
          )}
        </p>
      </header>

      <dl>
        <Figure label="Trades" tip={`${tooltips.closed ?? ''} ${tooltips.open ?? ''}`.trim()}>
          {card.closed} closed · {card.open} open
        </Figure>
        <Figure label="Mean net R" tip={tooltips.mean_r}>
          <span className={`inline-block px-1.5 rounded border ${COLOUR_CLASS[card.colour]}`} data-colour={card.colour}>
            {fmtR(card.mean_r)}
          </span>
          <span className="text-gray-500 text-xs"> ({fmtRange(card.mean_r_lo, card.mean_r_hi)}) n={card.closed}</span>
          {colourText && <span className="block text-[11px] text-gray-600">{colourText}</span>}
        </Figure>
        <Figure label="Backtest" tip={`${tooltips.backtest ?? ''} ${tooltips.verdict ?? ''}`.trim()}>
          {bt ? <>{fmtR(bt.mean_r)} <span className="text-gray-500 text-xs">({fmtRange(bt.mean_r_lo, bt.mean_r_hi)})</span></> : '—'}
          {' '}
          <Chip className={VERDICT_CLASS[card.verdict] ?? VERDICT_CLASS.inside} title={card.verdict === 'too_few' ? `Under ${minClosed} closed trades` : tooltips.verdict}>
            {VERDICT_LABEL[card.verdict] ?? card.verdict}
          </Chip>
        </Figure>
        <Figure label="Win rate" tip={`${tooltips.win_rate ?? ''} ${tooltips.avg_win_loss ?? ''}`.trim()}>
          {fmtShare(card.win_rate)}
          <span className="text-gray-500 text-xs"> · W {fmtR(card.avg_winner_r)} · L {fmtR(card.avg_loser_r)}</span>
        </Figure>
        <Figure label="Worst run" tip={`${tooltips.worst_streak ?? ''} ${tooltips.drawdown ?? ''}`.trim()}>
          {card.worst_losing_streak} losses in a row · drawdown {fmtR(card.max_drawdown_r)}
        </Figure>
        <Figure label="Median hold" tip={tooltips.median_hold}>
          {card.median_hold_bars === null ? '—' : `${fmtNum(card.median_hold_bars)} bars`}
        </Figure>
        <Figure label="Last 3 months" tip={tooltips.recent}>
          {card.recent.closed} closed · {fmtR(card.recent.mean_r)}
        </Figure>
        <Figure label="Open now" tip={tooltips.unrealised}>
          {ou.open === 0 ? 'none' : (
            <>
              {ou.priced} priced · {fmtR(ou.sum_r)} unrealised · {fmtShare(ou.share_above_0)} above 0
              {ou.awaiting_fill > 0 && <span className="text-gray-500 text-xs"> · {ou.awaiting_fill} awaiting fill</span>}
            </>
          )}
        </Figure>
      </dl>

      {/* chart */}
      <div className="mt-4">
        {card.show_chart
          ? <CumulativeRChart points={card.cumulative} ariaLabel={`Cumulative net R of ${card.label} ${card.direction}`} />
          : <p className="text-xs text-gray-500 font-mono">Chart from 5 closed trades ({card.closed} so far).</p>}
      </div>

      {card.earlier.length > 0 && (
        <p className="mt-3 text-xs text-gray-600">
          Earlier versions:{' '}
          {card.earlier.map((k, i) => (
            <span key={k}>
              {i > 0 && ', '}
              <a href={`#${anchorOf(k, card.direction)}`} className="font-mono underline hover:text-brand-primary">{k}</a>
            </span>
          ))}
        </p>
      )}

      {/* by month and trades (collapsed) */}
      <div className="mt-3 border-t border-brand-border pt-2">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="text-xs font-mono font-bold uppercase tracking-wider text-gray-600 hover:text-brand-primary">
          {open ? '▾' : '▸'} By month and trades
        </button>
        {open && (
          <div className="mt-2 space-y-4">
            <MonthTable rows={card.by_month} />
            {card.open_trades.length > 0 && (
              <TradeList title="Open trades" rows={card.open_trades.map((t) => ({
                id: t.id, ticker: t.ticker, date: t.signal_date,
                value: t.awaiting_fill ? 'awaiting fill' : fmtR(t.unrealised_r),
              }))} />
            )}
            {card.closed_trades.length > 0 && (
              <TradeList title="Closed trades (newest first)" rows={card.closed_trades.map((t) => ({
                id: t.id, ticker: t.ticker, date: t.exit_date, value: `${fmtR(t.r)} · ${t.status}`,
              }))} />
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function TradeList({ title, rows }: { title: string; rows: { id: number; ticker: string; date: string; value: string }[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-1">{title}</h4>
      <ul className="max-h-60 overflow-y-auto text-xs font-mono divide-y divide-brand-border/50">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-1">
            <span className="text-gray-700">{r.ticker} <span className="text-gray-400">{r.date}</span></span>
            <span className="flex items-center gap-2">
              <span>{r.value}</span>
              <Link to="/trade/$id" params={{ id: String(r.id) }} title="Open the trade chart"
                className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-brand-primary border border-brand-border rounded px-1.5 py-0.5">
                Chart
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ScoreCard
