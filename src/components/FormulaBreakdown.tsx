import { ArrowRight, HelpCircle, Landmark, ShieldAlert, TrendingUp } from "lucide-react";
import { formatFinancial, formatPrice, formatPercent } from "#/lib/utils";

interface FormulaBreakdownProps {
  symbol: string;
  currency: string;
  sharesOutstanding: number;
  totalDebt: number;
  cashAndEquivalents: number;
  lastClosePrice: number;

  // Selected Model's metrics
  modelLabel: string;
  baseMetricValue: number;
  pv20yr: number;
  ivBeforeAdjustment: number;
  finalIvPerShare: number;
  discountPremium: number;
  cashPerShare: number;
  debtPerShare: number;
}

export default function FormulaBreakdown({
  symbol,
  currency,
  sharesOutstanding,
  totalDebt,
  cashAndEquivalents,
  lastClosePrice,
  modelLabel,
  baseMetricValue,
  pv20yr,
  ivBeforeAdjustment,
  finalIvPerShare,
  discountPremium,
  cashPerShare,
  debtPerShare,
}: FormulaBreakdownProps) {
  const isUndervalued = finalIvPerShare > lastClosePrice;
  // Let's compute actual percentage relative to the Intrinsic Value or Last Close Price
  const marginOfSafety = isUndervalued
    ? ((finalIvPerShare - lastClosePrice) / finalIvPerShare)
    : 0;

  // Determine standard Premium or Discount representation
  const premiumPercent = Math.abs(discountPremium);

  return (
    <div className="bg-white border border-brand-border rounded-xl p-6 transition-all duration-200 animate-slide-up">
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-brand-border pb-4 mb-6">
        <Landmark className="w-5 h-5 text-brand-primary" />
        <h4 className="font-display text-lg font-semibold text-brand-dark">
          Valuation Algorithm & Arithmetic ({modelLabel} Model)
        </h4>
      </div>

      {/* Grid of Steps */}
      <div className="space-y-6">
        {/* Step 1: Base compounding */}
        <div className="relative pl-8 border-l border-brand-border pb-4">
          <div className="absolute -left-3 top-0 bg-white border border-brand-border text-brand-primary text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center">
            1
          </div>
          <div>
            <h5 className="font-display text-sm font-semibold text-brand-dark flex items-center gap-1.5">
              <span>Future Value Projection Stream (20 Years)</span>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded font-mono text-gray-500 font-medium">
                Stage 1 & 2 Rates
              </span>
            </h5>
            <p className="text-xs text-gray-500 mt-1">
              Project the trailing {modelLabel} of {formatFinancial(baseMetricValue, currency)} over 20 years, compounding through dynamic multi-stage annual growth thresholds.
            </p>

            <div className="mt-3 bg-brand-bg/60 rounded-lg p-3 font-mono text-xs flex flex-wrap gap-y-2 items-center justify-between border border-brand-border/40">
              <span className="text-gray-500">Compounded Sum:</span>
              <span className="font-bold text-brand-dark">
                {formatFinancial(pv20yr, currency)} (Discounted present value)
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Per Share Core Valuation */}
        <div className="relative pl-8 border-l border-brand-border pb-4">
          <div className="absolute -left-3 top-0 bg-white border border-brand-border text-brand-primary text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center">
            2
          </div>
          <div>
            <h5 className="font-display text-sm font-semibold text-brand-dark">
              Core Intrinsic Value (Pre-equity Adjustments)
            </h5>
            <p className="text-xs text-gray-500 mt-1">
              Divide the total projected 20-year present value of corporate funds by outstanding shares to calculate unit share equity before balance-sheet assets or debt load.
            </p>

            <div className="mt-3 bg-brand-bg/60 rounded-lg p-3 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 border border-brand-border/40">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-brand-primary font-bold">{formatFinancial(pv20yr, currency)}</span>
                <span className="text-gray-400">/</span>
                <span className="font-semibold text-gray-600">{sharesOutstanding.toLocaleString()} Shares</span>
              </div>
              <div className="flex items-center gap-1.5 text-brand-dark">
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-extrabold text-brand-primary">{formatPrice(ivBeforeAdjustment, currency)}</span>
                <span className="text-gray-400 text-[10px]">per share</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Cash and debt alignment */}
        <div className="relative pl-8 border-l border-brand-border pb-4">
          <div className="absolute -left-3 top-0 bg-white border border-brand-border text-brand-primary text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center">
            3
          </div>
          <div>
            <h5 className="font-display text-sm font-semibold text-brand-dark ml-0">
              Balance Sheet Equity adjustments
            </h5>
            <p className="text-xs text-gray-500 mt-1">
              To capture total share value relative to enterprise capital, liquid reserve cash is added and long-term liabilities/liens are deducted as absolute per-share weights.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 font-mono text-xs">
                <div className="flex justify-between items-center text-green-800">
                  <span className="font-medium text-[10px] uppercase">Add Liquid Reserve</span>
                  <span className="font-bold">+{formatPrice(cashPerShare, currency)}</span>
                </div>
                <div className="text-[10px] text-green-600 mt-1">
                  Based on cash reserves of {formatFinancial(cashAndEquivalents, currency)}
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-lg p-3 font-mono text-xs">
                <div className="flex justify-between items-center text-red-800">
                  <span className="font-medium text-[10px] uppercase">Deduct Net Debt Load</span>
                  <span className="font-bold">-{formatPrice(debtPerShare, currency)}</span>
                </div>
                <div className="text-[10px] text-red-600 mt-1">
                  Based on total debt liabilities of {formatFinancial(totalDebt, currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Final comparison */}
        <div className="relative pl-8 pb-1">
          <div className="absolute -left-3 top-0 bg-white border border-brand-border text-brand-primary text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center">
            4
          </div>
          <div>
            <h5 className="font-display text-sm font-semibold text-brand-dark">
              Adjusted Intrinsic Value vs. Market Price
            </h5>
            <p className="text-xs text-gray-500 mt-1">
              Compare the final adjusted intrinsic value per share with the last close market trading price.
            </p>

            <div className="mt-3 bg-brand-dark text-white rounded-xl p-5 border border-brand-primary/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Math */}
                <div className="col-span-1 md:col-span-2 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Core Intrinsic:</span>
                    <span className="text-white text-right">{formatPrice(ivBeforeAdjustment, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-green-400 font-medium">+ Cash Addition:</span>
                    <span className="text-green-300 text-right">+{formatPrice(cashPerShare, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-red-400 font-medium">- Debt Obligation:</span>
                    <span className="text-red-300 text-right">-{formatPrice(debtPerShare, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base pt-1">
                    <span className="text-gray-300 font-display font-semibold">Calculated IV:</span>
                    <span className="text-brand-primary font-bold">{formatPrice(finalIvPerShare, currency)}</span>
                  </div>
                </div>

                {/* Outcome Callout Box */}
                <div className="col-span-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-center md:text-left">
                  <span className="text-[10px] text-gray-400 tracking-wider font-mono font-bold uppercase block">
                    Market Arbitrage
                  </span>

                  {isUndervalued ? (
                    <div className="mt-2">
                      <div className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3" /> Undervalued
                      </div>
                      <p className="text-xl font-bold text-green-400 mt-2 font-mono">
                        {formatPercent(marginOfSafety)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Margin of Safety discount</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-0.5 rounded-full">
                        <ShieldAlert className="w-3 h-3" /> Overvalued
                      </div>
                      <p className="text-xl font-bold text-amber-500 mt-2 font-mono">
                        +{formatPercent(premiumPercent)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Trading at market premium</p>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 mt-3 font-mono">
                    Last Close: <span className="font-semibold text-white">{formatPrice(lastClosePrice, currency)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
