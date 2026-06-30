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
  eps_growth: number;
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

