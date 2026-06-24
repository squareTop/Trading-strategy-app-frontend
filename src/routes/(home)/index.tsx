import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  Building2,
  Calculator,
  ChevronDown,
  ChevronRight,
  Compass,
  Database,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
  TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import FormulaBreakdown from "#/components/FormulaBreakdown";
import "./styles.css";
import type { FoxelSignalIVResponse } from "../../lib/types";
import {
  formatFinancial,
  formatLargeNumber,
  formatPercent,
  formatPrice
} from "../../lib/utils";
import InteractiveChart from '#/components/InteractiveChart';

const POPULAR_TICKERS = [
  { symbol: "AAPL", label: "Apple" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "GOOGL", label: "Google" },
  { symbol: "NVDA", label: "NVIDIA" },
  // { symbol: "TSLA", label: "Tesla" },
  { symbol: "AMZN", label: "Amazon" },
  { symbol: "META", label: "Meta" }
];

export const stockDetailsQueryOptions = (symbol: string) =>
  queryOptions({
    queryKey: ['stockDetails', symbol],
    queryFn: async () => {
      const response = await fetch(`https://api.foxelsignal.io/vmi?symbol=${encodeURIComponent(symbol)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error status ${response.status} received from system.`);
      }
      return response.json() as Promise<FoxelSignalIVResponse>;
    },
  });

export const Route = createFileRoute('/(home)/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(stockDetailsQueryOptions(POPULAR_TICKERS[0].symbol)).catch(() => { });
  },
  component: App,
})

function App() {
  const [ticker, setTicker] = useState<string>("AAPL");
  const [searchInput, setSearchInput] = useState<string>("AAPL");
  const [activeModel, setActiveModel] = useState<"FCF" | "OCF" | "NI">("FCF");
  const [showJsonDump, setShowJsonDump] = useState<boolean>(false);

  const { data, isLoading, error, refetch } = useQuery(stockDetailsQueryOptions(ticker));

  // Synchronize search input with the canonical symbol when data changes
  useEffect(() => {
    if (data?.symbol) {
      setSearchInput(data.symbol);
    }
  }, [data?.symbol]);

  const handleSearchSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const cleanTicker = searchInput.trim().toUpperCase();
    if (cleanTicker) {
      setTicker(cleanTicker);
    }
  };

  const getModelDetails = () => {
    if (!data) return null;
    switch (activeModel) {
      case "NI":
        return {
          label: "Net Income (NI) Method",
          baseVal: data.net_income,
          pv20yr: data.pv_20yr_ni,
          ivBefore: data.intrinsic_value_before_cash_debt_ni,
          finalIv: data.intrinsic_value_per_share_ni,
          discountPremium: data.discount_premium_ni,
          cashPerShare: data.cash_per_share_ni,
          debtPerShare: data.debt_per_share_ni,
          premium: data.discount_premium_ni
        };
      case "OCF":
        return {
          label: "Operating Cash Flow (OCF) Method",
          baseVal: data.operating_cash_flow,
          pv20yr: data.pv_20yr_ocf,
          ivBefore: data.intrinsic_value_before_cash_debt_ocf,
          finalIv: data.intrinsic_value_per_share_ocf,
          discountPremium: data.discount_premium_ocf,
          cashPerShare: data.cash_per_share_ocf,
          debtPerShare: data.debt_per_share_ocf,
          premium: data.discount_premium_ocf
        };
      case "FCF":
      default:
        return {
          label: "Free Cash Flow (FCF) Method",
          baseVal: data.free_cash_flow,
          pv20yr: data.pv_20yr_fcf,
          ivBefore: data.intrinsic_value_before_cash_debt_fcf,
          finalIv: data.intrinsic_value_per_share_fcf,
          discountPremium: data.discount_premium_fcf,
          cashPerShare: data.cash_per_share_fcf,
          debtPerShare: data.debt_per_share_fcf,
          premium: data.discount_premium_fcf
        };
    }
  };

  const currentModel = getModelDetails();

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      {/* Editorial Tech Banner Head */}
      <header className="border-b border-brand-border bg-white px-4 md:px-8 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white font-extrabold text-lg tracking-wider select-none shadow-md shadow-brand-primary/20">
              FS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-lg tracking-tight text-brand-dark">FC</span>
                <span className="font-display font-medium text-lg tracking-tight text-brand-dark">FoxelSignal</span>
              </div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold">
                Intrinsic Value Core Terminal
              </p>
            </div>
          </div>

          {/* Right indicator rail */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden md:flex items-center gap-2 bg-[#f4ece1] px-2.5 py-1 rounded-md border border-[#e2d8c9] text-gray-600">
              <Compass className="w-3.5 h-3.5 text-brand-primary" />
              <span>Engine Status: <strong className="text-brand-dark">API Ready</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Live Data Pipeline</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Terminal Frame Layout */}
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 mt-8">
        {/* Search & Selection Card */}
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs">
          <div className="max-w-2xl">
            <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider block mb-1">
              Active Evaluation Terminal
            </span>
            <h1 className="font-display text-2xl md:text-3.5xl font-extrabold text-brand-dark tracking-tight leading-none">
              Explore Enterprise Intrinsic Valuation
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Provide a global equities ticker symbol (e.g. AAPL, AMZN, MSFT) below. Our engine pulls live filings
              and models intrinsic values via Net Income, Operating Cash Flow, and Free Cash Flow Discounting.
            </p>
          </div>

          {/* Form input - Precise styling round 8px inputs, 14px button with orange glow */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter stock ticker (e.g. MSFT)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-brand-border bg-brand-bg/30 text-brand-dark font-mono font-semibold placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all text-sm uppercase"
              />
            </div>
            <button
              id="search-btn"
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-brand-primary text-white text-xs font-extrabold uppercase tracking-wide hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>Execute Analysis</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-2 text-xs text-gray-400 font-mono">
            Note: For SG and HK stocks, suffixes must be added (i.e. <strong className="text-brand-primary">.SI</strong> and <strong className="text-brand-primary">.HK</strong> respectively).
          </p>

          {/* Quick Tickers Selection Bar */}
          <div className="mt-5 pt-4 border-t border-brand-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 mr-2">
              Instant Profiles:
            </span>
            {POPULAR_TICKERS.map((pt) => (
              <button
                key={pt.symbol}
                onClick={() => {
                  setSearchInput(pt.symbol);
                  setTicker(pt.symbol);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all border ${ticker === pt.symbol
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-brand-bg text-gray-600 border-brand-border hover:border-brand-primary hover:text-brand-primary hover:bg-white"
                  }`}
              >
                {pt.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Global Loading Overlay Screen */}
        {isLoading && (
          <div className="mt-8 bg-white border border-brand-border rounded-xl p-16 flex flex-col items-center justify-center text-center animate-fade-in shadow-xs">
            <div className="w-12 h-12 rounded-full border-4 border-brand-bg border-t-brand-primary animate-spin mb-4"></div>
            <p className="font-display text-lg font-bold text-brand-dark">
              Gathering filings & modeling cash-flows...
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono uppercase">
              Computing three-method intrinsic valuations for {ticker}
            </p>
          </div>
        )}

        {/* Error Boundary Module */}
        {!isLoading && error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 animate-slide-up shadow-xs">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display text-base font-bold text-red-950">Query Exception Encountered</h4>
                <p className="text-sm text-red-800 mt-1">{(error as Error).message}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setSearchInput("AAPL");
                      setTicker("AAPL");
                    }}
                    className="bg-red-900/10 hover:bg-red-900/25 text-red-950 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-red-900/10"
                  >
                    Reset & Load AAPL
                  </button>
                  <button
                    onClick={() => refetch()}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    Retry Query
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Panels (Visible when data exists) */}
        {!isLoading && !error && data && (
          <div className="mt-8 grid grid-cols-1 gap-8 animate-fade-in">
            {/* Stock Metadata Profile Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card Left */}
              <div className="col-span-1 lg:col-span-2 bg-white border border-brand-border rounded-xl p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-brand-bg text-brand-dark text-[10px] font-mono font-bold px-2.5 py-1 rounded-sm border border-brand-border">
                        <Building2 className="w-3 h-3 text-brand-primary" />
                        <span>Corporate Profile</span>
                      </div>
                      <h2 className="font-display text-2xl font-black text-brand-dark mt-2.5 leading-none">
                        {data.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 font-mono">
                        <span className="font-bold text-brand-primary text-sm">{data.symbol}</span>
                        <span>•</span>
                        <span>Financial Currency: {data.financial_currency}</span>
                        <span>•</span>
                        <span>Exchange: {data.listing_currency}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">
                        Last Close Price
                      </span>
                      <p className="font-mono text-2.5xl font-black text-brand-dark leading-none mt-1">
                        {formatPrice(data.last_close_price, data.listing_currency)}
                      </p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1">
                        Fiscal Period: <strong className="text-brand-dark">{data.current_year}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-brand-border">
                  <div className="bg-brand-bg/50 p-3 rounded-lg border border-brand-border/40 text-center sm:text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                      System Beta (Volatility)
                    </span>
                    <span className="font-mono text-base font-extrabold text-brand-dark">
                      {data.beta}
                    </span>
                    <span className="block text-[9px] text-gray-400 mt-0.5">
                      {data.beta > 1 ? "Higher volatility" : "Stable profile"}
                    </span>
                  </div>

                  <div className="bg-brand-bg/50 p-3 rounded-lg border border-brand-border/40 col-span-1 text-center sm:text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                      Hurdle / Discount Rate
                    </span>
                    <span className="font-mono text-base font-extrabold text-[#964a1d]">
                      {formatPercent(data.discount_rate)}
                    </span>
                    <span className="block text-[9px] text-gray-400 mt-0.5">
                      Standard hurdle limit
                    </span>
                  </div>

                  <div className="bg-brand-bg/50 p-3 rounded-lg border border-brand-border/40 col-span-2 sm:col-span-1 text-center sm:text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                      Shares Outstanding
                    </span>
                    <span className="font-mono text-base font-extrabold text-brand-dark leading-none">
                      {formatLargeNumber(data.shares_outstanding)}
                    </span>
                    <span className="block text-[9px] text-gray-400 mt-1.5">
                      Weighted base
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash & Debt Adjustment Box */}
              <div className="bg-white border border-brand-border rounded-xl p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-brand-primary" />
                    <h3 className="font-display text-sm font-semibold text-brand-dark uppercase tracking-wider font-bold">
                      Balance Sheet Adjustments
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs pb-3 border-b border-brand-border/50">
                      <div>
                        <span className="font-bold text-brand-dark block">Cash & Liquid Equivalents</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatFinancial(data.cash_and_equivalents, data.financial_currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="font-mono text-green-600 block">
                          +{formatPrice(data.cash_per_share_fcf, data.financial_currency)}
                        </strong>
                        <span className="text-[10px] text-gray-400 font-mono">per share</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-3 border-b border-brand-border/50">
                      <div>
                        <span className="font-bold text-brand-dark block">Total Funded Debt Load</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatFinancial(data.total_debt, data.financial_currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="font-mono text-red-600 block">
                          -{formatPrice(data.debt_per_share_fcf, data.financial_currency)}
                        </strong>
                        <span className="text-[10px] text-gray-400 font-mono">per share</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-brand-dark block">Net Balance Sheet Weight</span>
                        <span className="text-[10px] text-gray-400 font-mono">Adjusted equity modifier</span>
                      </div>
                      <div className="text-right">
                        <strong className={`font-mono block ${(data.cash_per_share_fcf - data.debt_per_share_fcf) >= 0
                          ? "text-green-600"
                          : "text-red-700"
                          }`}>
                          {(data.cash_per_share_fcf - data.debt_per_share_fcf) >= 0 ? "+" : ""}
                          {formatPrice(data.cash_per_share_fcf - data.debt_per_share_fcf, data.financial_currency)}
                        </strong>
                        <span className="text-[10px] text-gray-400 font-mono">per share</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 bg-brand-bg/60 p-3 rounded-lg text-center font-mono text-[10px] text-gray-500 border border-brand-border/40">
                  Formula: Final IV = IV before assets + Cash - Debt
                </div>
              </div>
            </div>

            {/* Model Comparison Grid - 3 Columns representing 3 calculated Intrinsic Values */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-brand-primary" />
                <h3 className="font-display text-lg font-bold text-brand-dark">
                  Calculated Intrinsic Value (IV) across Methodologies
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Method 1: Free Cash Flow */}
                <div
                  onClick={() => setActiveModel("FCF")}
                  className={`bg-white border rounded-xl p-5 cursor-pointer transition-all duration-200 relative ${activeModel === "FCF"
                    ? "ring-2 ring-brand-primary border-transparent translate-y-[-4px] shadow-md"
                    : "border-brand-border hover:border-brand-primary hover:shadow-xs"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary block">
                        Corporate Core Value
                      </span>
                      <h4 className="font-display font-bold text-base text-brand-dark mt-1">
                        Free Cash Flow (FCF)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                      Standard
                    </span>
                  </div>

                  <div className="my-5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400">
                      Calculated Intrinsic Value
                    </span>
                    <p className="font-mono text-3xl font-black text-brand-dark leading-none mt-1">
                      {formatPrice(data.intrinsic_value_per_share_fcf, data.listing_currency)}
                    </p>
                  </div>

                  <div className="border-t border-brand-border/50 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-mono">Market vs IV:</span>
                    {data.intrinsic_value_per_share_fcf > data.last_close_price ? (
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Discount (Undervalued)
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {formatPercent(Math.abs(data.discount_premium_fcf))} Premium
                      </span>
                    )}
                  </div>
                </div>

                {/* Method 2: Operating Cash Flow */}
                <div
                  onClick={() => setActiveModel("OCF")}
                  className={`bg-white border rounded-xl p-5 cursor-pointer transition-all duration-200 relative ${activeModel === "OCF"
                    ? "ring-2 ring-brand-primary border-transparent translate-y-[-4px] shadow-md"
                    : "border-brand-border hover:border-brand-primary hover:shadow-xs"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary block">
                        Enterprise Liquidity
                      </span>
                      <h4 className="font-display font-bold text-base text-brand-dark mt-1">
                        Operating Cash Flow (OCF)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-100 font-bold">
                      Operational
                    </span>
                  </div>

                  <div className="my-5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400">
                      Calculated Intrinsic Value
                    </span>
                    <p className="font-mono text-3xl font-black text-brand-dark leading-none mt-1">
                      {formatPrice(data.intrinsic_value_per_share_ocf, data.listing_currency)}
                    </p>
                  </div>

                  <div className="border-t border-brand-border/50 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-mono">Market vs IV:</span>
                    {data.intrinsic_value_per_share_ocf > data.last_close_price ? (
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Discount (Undervalued)
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {formatPercent(Math.abs(data.discount_premium_ocf))} Premium
                      </span>
                    )}
                  </div>
                </div>

                {/* Method 3: Net Income */}
                <div
                  onClick={() => setActiveModel("NI")}
                  className={`bg-white border rounded-xl p-5 cursor-pointer transition-all duration-200 relative ${activeModel === "NI"
                    ? "ring-2 ring-brand-primary border-transparent translate-y-[-4px] shadow-md"
                    : "border-brand-border hover:border-brand-primary hover:shadow-xs"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary block">
                        Accrual Profitability
                      </span>
                      <h4 className="font-display font-bold text-base text-brand-dark mt-1">
                        Net Income (NI)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                      Accounting
                    </span>
                  </div>

                  <div className="my-5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400">
                      Calculated Intrinsic Value
                    </span>
                    <p className="font-mono text-3xl font-black text-brand-dark leading-none mt-1">
                      {formatPrice(data.intrinsic_value_per_share_ni, data.listing_currency)}
                    </p>
                  </div>

                  <div className="border-t border-brand-border/50 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-mono">Market vs IV:</span>
                    {data.intrinsic_value_per_share_ni > data.last_close_price ? (
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Discount (Undervalued)
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {formatPercent(Math.abs(data.discount_premium_ni))} Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Model Forecast Graphs & Calculations Details Section */}
            <div className="bg-[#f0eadd] border border-brand-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-3.5 mb-5 border-b border-brand-border pb-4">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-dark leading-none">
                    Deep-Dive Analysis Module: {currentModel?.label}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Click any model card above to render its specific 20-year discrete projection line and math breakdown below.
                  </p>
                </div>
              </div>

              {currentModel && (
                <div className="space-y-6">
                  {/* Dynamic Math SVG chart */}
                  <InteractiveChart
                    baseVal={currentModel.baseVal}
                    growth1={data.growth_rate_1_5}
                    growth6={data.growth_rate_6_10}
                    growth11={data.growth_rate_11_20}
                    discountRate={data.discount_rate}
                    label={currentModel.label}
                    currency={data.financial_currency}
                  />

                  {/* Math Formula breakdown list */}
                  <FormulaBreakdown
                    symbol={data.symbol}
                    currency={data.listing_currency}
                    sharesOutstanding={data.shares_outstanding}
                    totalDebt={data.total_debt}
                    cashAndEquivalents={data.cash_and_equivalents}
                    lastClosePrice={data.last_close_price}
                    modelLabel={activeModel === "FCF" ? "FCF" : activeModel === "OCF" ? "OCF" : "Net Income"}
                    baseMetricValue={currentModel.baseVal}
                    pv20yr={currentModel.pv20yr}
                    ivBeforeAdjustment={currentModel.ivBefore}
                    finalIvPerShare={currentModel.finalIv}
                    discountPremium={currentModel.premium}
                    cashPerShare={currentModel.cashPerShare}
                    debtPerShare={currentModel.debtPerShare}
                  />
                </div>
              )}
            </div>

            {/* API developer parameters section */}
            <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs">
              <button
                onClick={() => setShowJsonDump(!showJsonDump)}
                className="w-full flex items-center justify-between gap-3 text-brand-dark hover:text-brand-primary transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4.5 h-4.5 text-brand-primary" />
                  <span className="font-display font-semibold text-sm">
                    Inspect Raw FoxelSignal API Payload (JSON)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
                  <span>{showJsonDump ? "Hide console" : "Expand console"}</span>
                  {showJsonDump ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {showJsonDump && (
                <div className="mt-4 animate-fade-in">
                  <p className="text-xs text-gray-500 mb-2">
                    Developer Interface: Real response packet extracted directly from our <code>api.foxelsignal.io/vmi</code> server route.
                  </p>
                  <pre className="bg-[#111827] text-[#93c5fd] font-mono text-xs p-4 rounded-lg overflow-x-auto max-h-96 border border-brand-primary/10 leading-snug">
                    <code>{JSON.stringify(data, null, 2)}</code>
                  </pre>

                  {/* Endpoint copyable representation */}
                  <div className="mt-4 bg-brand-bg/50 border border-brand-border/60 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 font-mono text-[10px] text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">
                        GET
                      </span>
                      <span className="font-bold text-brand-dark">https://api.foxelsignal.io/vmi?symbol={data.symbol}</span>
                    </div>
                    <div className="text-gray-400">
                      Query ID: <span className="font-semibold text-gray-600">{data.id}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
