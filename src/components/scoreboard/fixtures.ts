// 2026-11-12 (Scoreboard Rebuild): test fixtures shaped like GET /api/scoreboard/v2 and
// /summary. Placeholder figures, not real results.
import type { ScoreCardData, ScoreboardV2Response, ScoreSummaryLine } from '#/lib/types'

export const TOOLTIPS: Record<string, string> = {
  stage: 'Current stage', live_since: 'Go-live date', signals_per_week: 'Signals a week',
  closed: 'Closed trades', open: 'Open trades', mean_r: 'Mean net R and 95% range',
  backtest: 'Backtest mean', verdict: 'Live range vs backtest range', win_rate: 'Win rate',
  avg_win_loss: 'Average winner and loser', worst_streak: 'Worst losing streak', drawdown: 'Deepest drawdown',
  median_hold: 'Median bars held', unrealised: 'Open trades valued at the latest close', recent: 'Last 91 days',
}

export function makeCard(over: Partial<ScoreCardData> = {}): ScoreCardData {
  return {
    key: 'smooth_trend@2', strategy: 'smooth_trend', version: 2, version_label: '@2', label: 'smooth_trend@2',
    display_name: 'Smooth Trend (Williams %R)', style: 'trend_following', style_display: 'Trend following',
    direction: 'long', anchor: 'smooth-trend-2-long', section: 'live', stage: 'forward',
    go_live: '2026-11-03', sessions_live: 8, asof: '2026-11-11', signals: 59, signals_per_week: 14.25,
    closed: 41, open: 18, unscored: 0,
    mean_r: -0.62, mean_r_lo: -0.95, mean_r_hi: -0.3,
    backtest: { mean_r: -0.18, mean_r_lo: -0.22, mean_r_hi: -0.14, trades: 900, asof: '2026-11-07', period: '2021-Jun 2026' },
    verdict: 'below', colour: 'red', win_rate: 0.29, avg_winner_r: 0.8, avg_loser_r: -1.0,
    worst_losing_streak: 9, max_drawdown_r: -27.4, median_hold_bars: 4,
    open_unrealised: { open: 18, priced: 16, awaiting_fill: 2, sum_r: 3.4, share_above_0: 0.5625 },
    recent: { days: 91, closed: 41, mean_r: -0.62 },
    show_chart: true,
    cumulative: [
      { date: '2026-11-04', cum_r: -1.0, trades: 1, expected_r: -0.18 },
      { date: '2026-11-05', cum_r: -2.2, trades: 3, expected_r: -0.54 },
      { date: '2026-11-06', cum_r: -1.4, trades: 5, expected_r: -0.9 },
    ],
    by_month: [{ month: '2026-11', closed: 41, wins: 12, win_rate: 0.2927, mean_r: -0.62, sum_r: -25.42 }],
    open_trades: [{ id: 501, ticker: 'QQQ', direction: 'long', signal_date: '2026-11-10', unrealised_r: 0.4, awaiting_fill: false }],
    closed_trades: [{ id: 402, ticker: 'XLE', direction: 'long', signal_date: '2026-11-03', exit_date: '2026-11-06', status: 'stop', r: -1.02 }],
    earlier: ['smooth_trend · R0', 'smooth_trend@1'],
    retired_on: null, retired_reason: null,
    record: 'smooth_trend@2 · forward · 41 closed · -0.62 R/trade · below backtest',
    ...over,
  }
}

export function makePayload(over: Partial<ScoreboardV2Response> = {}): ScoreboardV2Response {
  return {
    computed_at: '2026-11-12T00:31:00+00:00', asof: '2026-11-11', stale: false, expected_us_bar: '2026-11-11',
    min_closed: 30, tooltips: TOOLTIPS,
    live: [makeCard(), makeCard({
      key: 'MR-A2@2', strategy: 'MR-A2', label: 'MR-A2@2', anchor: 'mr-a2-2-long', closed: 22, verdict: 'too_few',
      colour: 'neutral', earlier: [], display_name: 'Oversold Reversal (Long)', style_display: 'Mean reversion',
      record: 'MR-A2@2 · forward · too few trades to judge (22 closed)',
    })],
    retired: [{
      strategy: 'smooth_trend', display_name: 'Smooth Trend (Williams %R)', style_display: 'Trend following',
      cards: [makeCard({ key: 'smooth_trend@1', label: 'smooth_trend@1', anchor: 'smooth-trend-1-long', section: 'retired',
        stage: 'retired', go_live: null, sessions_live: null, signals_per_week: null, open: 0, earlier: [],
        last_signal: '2026-10-27', closed: 134, verdict: 'no_backtest', colour: 'neutral' })],
    }],
    ...over,
  }
}

export function line(over: Partial<ScoreSummaryLine> = {}): ScoreSummaryLine {
  return {
    key: 'smooth_trend@2', direction: 'long', section: 'live', label: 'smooth_trend@2', stage: 'forward',
    closed: 412, mean_r: -0.12, mean_r_lo: -0.2, mean_r_hi: -0.04, verdict: 'below', colour: 'red',
    record: 'smooth_trend@2 · forward · 412 closed · -0.12 R/trade · below backtest', anchor: 'smooth-trend-2-long',
    ...over,
  }
}
