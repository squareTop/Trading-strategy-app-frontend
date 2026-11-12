export interface FoxelSignalIVResponse {
  created_at: string;
  updated_at: string;
  id: string;
  symbol: string;
  name: string;
  listing_currency: string;
  financial_currency: string;
  exchange_rate: number;
  beta: number;
  shares_outstanding: number;
  last_close_price: number;
  discount_rate: number;
  growth_rate_1_5: number;
  growth_rate_6_10: number;
  growth_rate_11_20: number;
  total_debt: number;
  cash_and_equivalents: number;
  total_assets: number;
  current_debt: number;
  long_term_debt: number;
  eps_growth_yoy: number;
  projected_eps_growth_3_5y: number | null;
  price_to_book_ratios_ttm: number;
  price_to_earnings_ratios_ttm: number;
  return_on_invested_capital_ttm: number;

  // Net Income Model
  net_income: number;
  pv_20yr_ni: number;
  intrinsic_value_before_cash_debt_ni: number;
  intrinsic_value_per_share_ni: number;
  discount_premium_ni: number;
  cash_per_share_ni: number;
  debt_per_share_ni: number;

  // Operating Cash Flow Model
  operating_cash_flow: number;
  pv_20yr_ocf: number;
  intrinsic_value_before_cash_debt_ocf: number;
  intrinsic_value_per_share_ocf: number;
  discount_premium_ocf: number;
  cash_per_share_ocf: number;
  debt_per_share_ocf: number;

  // Free Cash Flow Model
  free_cash_flow: number;
  pv_20yr_fcf: number;
  intrinsic_value_before_cash_debt_fcf: number;
  intrinsic_value_per_share_fcf: number;
  discount_premium_fcf: number;
  cash_per_share_fcf: number;
  debt_per_share_fcf: number;

  current_year: number;

  // ETF Data Points
  is_etf?: boolean;
  exchange?: string;
  expense_ratio?: number;
  assets_under_management?: number;
  inception_date?: string;
  investment_objective?: string;
  asset_class?: string;
  avg_volume?: number;
  error?: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// 2026-11-12 (Scoreboard Rebuild): GET /api/scoreboard/v2 and /summary.
// Every figure is computed on the server (app/strategies/scoreboard.py); the
// browser only shows them.
// ─────────────────────────────────────────────────────────────────────────────
export type ScoreVerdict = 'too_few' | 'inside' | 'below' | 'above' | 'no_backtest'
export type ScoreColour = 'neutral' | 'green' | 'red'

export interface ScoreBacktest {
  mean_r: number | null
  mean_r_lo: number | null
  mean_r_hi: number | null
  trades: number | null
  asof: string | null
  period: string | null
}

export interface ScorePoint {
  date: string
  cum_r: number
  trades: number
  expected_r: number | null
}

export interface ScoreMonth {
  month: string
  closed: number
  wins: number
  win_rate: number
  mean_r: number
  sum_r: number
}

export interface ScoreOpenTrade {
  id: number
  ticker: string
  direction: string
  signal_date: string
  unrealised_r: number | null
  awaiting_fill: boolean
}

export interface ScoreClosedTrade {
  id: number
  ticker: string
  direction: string
  signal_date: string
  exit_date: string
  status: string
  r: number | null
}

export interface ScoreCardData {
  key: string
  strategy: string
  version: number | null
  version_label: string
  label: string
  display_name: string | null
  style: string | null
  style_display: string | null
  direction: 'long' | 'short' | 'all'
  anchor: string
  section: 'live' | 'shadow' | 'retired'
  stage: string | null
  go_live: string | null
  sessions_live: number | null
  asof: string | null
  signals: number
  signals_per_week: number | null
  closed: number
  open: number
  unscored: number
  mean_r: number | null
  mean_r_lo: number | null
  mean_r_hi: number | null
  backtest: ScoreBacktest | null
  verdict: ScoreVerdict
  colour: ScoreColour
  win_rate: number | null
  avg_winner_r: number | null
  avg_loser_r: number | null
  worst_losing_streak: number
  max_drawdown_r: number
  median_hold_bars: number | null
  open_unrealised: {
    open: number
    priced: number
    awaiting_fill: number
    sum_r: number | null
    share_above_0: number | null
  }
  recent: { days: number; closed: number; mean_r: number | null }
  show_chart: boolean
  cumulative: ScorePoint[]
  by_month: ScoreMonth[]
  open_trades: ScoreOpenTrade[]
  closed_trades: ScoreClosedTrade[]
  earlier: string[]
  retired_on: string | null
  retired_reason: string | null
  last_signal?: string | null
  record: string
}

export interface ScoreRetiredGroup {
  strategy: string
  display_name: string | null
  style_display: string | null
  cards: ScoreCardData[]
}

export interface ScoreboardV2Response {
  computed_at: string | null
  asof: string | null
  stale: boolean
  expected_us_bar: string | null
  min_closed: number
  tooltips: Record<string, string>
  live: ScoreCardData[]
  retired: ScoreRetiredGroup[]
}

export interface ScoreSummaryLine {
  key: string
  direction: string
  section: 'live' | 'shadow' | 'retired'
  label: string | null
  stage: string | null
  closed: number | null
  mean_r: number | null
  mean_r_lo: number | null
  mean_r_hi: number | null
  verdict: ScoreVerdict | null
  colour: ScoreColour | null
  record: string | null
  anchor: string | null
}

export interface ScoreboardSummaryResponse {
  computed_at: string | null
  lines: ScoreSummaryLine[]
}
