import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Bookmark,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Lock,
  Loader2,
  AlertCircle,
  BarChart2,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useWatchlist } from '../../lib/watchlist'
import { formatFinancial, formatPrice } from '../../lib/utils'
import { TickerAutocomplete } from '../../components/TickerAutocomplete'

export const Route = createFileRoute('/(home)/watchlist')({
  head: () => ({
    meta: [
      {
        title: 'Watchlist | FoxelSignal',
      },
      {
        name: 'description',
        content:
          'Track equity prices, DCF intrinsic value, multiples, and momentum indicators.',
      },
    ],
  }),
  component: WatchlistPage,
})

const SUGGESTED_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA']

function formatPct(value: number | null | undefined, isRatio = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const val = isRatio ? value * 100 : value
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

function WatchlistPage() {
  const navigate = useNavigate()
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth()
  const {
    watchlist,
    isLoading: isWatchlistLoading,
    isRefetching,
    addStock,
    isAdding,
    removeStock,
    isRemoving,
    refetch,
  } = useWatchlist()

  const [symbolInput, setSymbolInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null)

  // Route protection
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({
        to: '/login',
        search: { redirect: '/watchlist' },
      })
    }
  }, [isAuthLoading, isAuthenticated, navigate])

  const handleAdd = async (symbolToAdd?: string) => {
    const sym = (symbolToAdd || symbolInput).trim().toUpperCase()
    if (!sym) return

    setErrorMessage(null)
    try {
      await addStock(sym)
      setSymbolInput('')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to add ticker to watchlist.')
      }
    }
  }

  const handleRemove = async (symbol: string) => {
    setRemovingSymbol(symbol)
    try {
      await removeStock(symbol)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      }
    } finally {
      setRemovingSymbol(null)
    }
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center animate-pulse mb-4">
          <Lock className="w-6 h-6 text-brand-primary" />
        </div>
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
          Authenticating watchlist session...
        </p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono font-semibold mb-2">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Portfolio Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-brand-dark tracking-tight">
            My Watchlist
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time price action, valuation multiples, 52W high discount, and DCF intrinsic value.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching || isWatchlistLoading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2.5 sm:py-2 rounded-xl border border-brand-border bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-brand-bg active:bg-brand-bg active:border-brand-primary active:scale-95 text-brand-dark text-xs font-mono font-bold transition-all duration-150 cursor-pointer shadow-xs disabled:opacity-60 select-none touch-manipulation"
          title="Refresh quotes"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 shrink-0 ${isRefetching ? 'animate-spin text-brand-primary' : ''}`}
          />
          <span>{isRefetching ? 'Refreshing...' : 'Refresh Quotes'}</span>
        </button>
      </div>

      {/* Add Ticker Bar */}
      <div className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 mb-6 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAdd()
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="flex-1">
            <TickerAutocomplete
              value={symbolInput}
              onChange={setSymbolInput}
              onSelectTicker={(selectedSymbol) => {
                setSymbolInput(selectedSymbol)
                handleAdd(selectedSymbol)
              }}
              onSubmit={() => handleAdd()}
              placeholder="Enter ticker or company name (e.g. Apple, Tesla, NVDA)..."
              inputClassName="w-full pl-10 pr-9 py-2.5 bg-brand-bg/30 border border-brand-border rounded-xl text-xs sm:text-sm font-mono text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !symbolInput.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-dark text-white hover:bg-brand-primary transition-colors rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-xs"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Ticker</span>
              </>
            )}
          </button>
        </form>

        {/* Suggested Quick Add Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-400 font-mono text-[11px] mr-1">Popular:</span>
          {SUGGESTED_TICKERS.map((sym) => {
            const alreadyIn = watchlist.some((item) => item.symbol === sym)
            return (
              <button
                key={sym}
                type="button"
                onClick={() => !alreadyIn && handleAdd(sym)}
                disabled={alreadyIn || isAdding}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all ${alreadyIn
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-default'
                    : 'bg-brand-bg/60 text-brand-dark border border-brand-border hover:border-brand-primary hover:text-brand-primary cursor-pointer'
                  }`}
              >
                {sym} {alreadyIn ? '✓' : '+'}
              </button>
            )
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-sans animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Watchlist Table */}
      {isWatchlistLoading && watchlist.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-2xl p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Fetching market metrics & DCF valuations...
          </p>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-brand-bg text-brand-primary mx-auto flex items-center justify-center mb-3">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-display text-brand-dark">
            Your Watchlist is Empty
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Search for any US stock ticker above or click one of the popular suggestions to start tracking intrinsic values.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-brand-border rounded-2xl shadow-xs overflow-hidden">
          <div className="sm:hidden px-4 py-2 bg-brand-bg/40 border-b border-brand-border text-[10px] font-mono text-gray-400 flex items-center justify-between">
            <span>Scroll horizontally for all 10 metrics →</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs border-collapse font-sans table-auto">
              <thead>
                <tr className="bg-brand-bg/40 border-b border-brand-border text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 select-none whitespace-nowrap">
                  <th className="py-3 px-4 min-w-[130px]">Ticker</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-right">Day %</th>
                  <th className="py-3 px-3 text-right">Market Cap</th>
                  <th className="py-3 px-3 text-right">P/S</th>
                  <th className="py-3 px-3 text-right">P/E</th>
                  <th className="py-3 px-3 text-right">% YTD</th>
                  <th className="py-3 px-3 text-right">% 1Y</th>
                  <th className="py-3 px-3 text-right">% 52W High</th>
                  <th className="py-3 px-3 text-right">Intrinsic Value</th>
                  <th className="py-3 px-3 text-right">Valuation</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {watchlist.map((item) => {
                  const dayPositive = (item.day_pct ?? 0) >= 0
                  const ytdPositive = (item.ytd ?? 0) >= 0
                  const oneYrPositive = (item.one_yr ?? 0) >= 0

                  const hasIv = item.intrinsic_value !== null && item.intrinsic_value !== undefined
                  const hasPrice = item.price !== null && item.price !== undefined
                  const isNegativeIv = hasIv && item.intrinsic_value! <= 0
                  const isUndervalued = hasIv && hasPrice && !isNegativeIv && item.intrinsic_value! > item.price!
                  const isFairValue = hasIv && hasPrice && !isNegativeIv && item.intrinsic_value! === item.price!

                  const pct = hasIv && hasPrice && item.intrinsic_value! !== 0
                    ? Math.abs((item.price! - item.intrinsic_value!) / Math.abs(item.intrinsic_value!)) * 100
                    : item.over_under_pct !== null
                      ? Math.abs(item.over_under_pct * 100)
                      : null

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-brand-bg/25 transition-colors group whitespace-nowrap"
                    >
                      {/* Ticker & Name */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap min-w-[130px]">
                        <Link
                          to="/"
                          search={{ ticker: item.symbol }}
                          className="font-black text-brand-dark hover:text-brand-primary text-sm tracking-tight inline-flex items-center gap-1 group-hover:underline"
                          title="Open DCF Valuation Model"
                        >
                          <span>{item.symbol}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary" />
                        </Link>
                        {item.name && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[130px] font-sans font-normal">
                            {item.name}
                          </p>
                        )}
                      </td>

                      {/* 1. Price */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-brand-dark text-[13px] whitespace-nowrap">
                        {item.price !== null ? formatPrice(item.price) : '—'}
                      </td>

                      {/* 2. Day % */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs whitespace-nowrap">
                        {item.day_pct !== null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 ${dayPositive ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                          >
                            {dayPositive ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {formatPct(item.day_pct)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* 3. Market Cap */}
                      <td className="py-3.5 px-3 text-right font-mono text-gray-600 text-[11px] whitespace-nowrap">
                        {item.market_cap ? formatFinancial(item.market_cap) : '—'}
                      </td>

                      {/* 4. P/S */}
                      <td className="py-3.5 px-3 text-right font-mono text-gray-700 text-[11px] whitespace-nowrap">
                        {item.ps !== null ? `${item.ps.toFixed(2)}x` : '—'}
                      </td>

                      {/* 5. P/E */}
                      <td className="py-3.5 px-3 text-right font-mono text-gray-700 text-[11px] whitespace-nowrap">
                        {item.pe !== null ? `${item.pe.toFixed(1)}x` : '—'}
                      </td>

                      {/* 6. % YTD */}
                      <td
                        className={`py-3.5 px-3 text-right font-mono font-medium text-[11px] whitespace-nowrap ${ytdPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                      >
                        {formatPct(item.ytd)}
                      </td>

                      {/* 7. % 1Y */}
                      <td
                        className={`py-3.5 px-3 text-right font-mono font-medium text-[11px] whitespace-nowrap ${oneYrPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                      >
                        {formatPct(item.one_yr)}
                      </td>

                      {/* 8. % from 52W High */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-[11px] text-gray-600 whitespace-nowrap">
                        {item.pct_from_52w_high !== null
                          ? formatPct(item.pct_from_52w_high)
                          : '—'}
                      </td>

                      {/* 9. Intrinsic Value */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[13px] text-brand-dark whitespace-nowrap">
                        {item.intrinsic_value !== null ? (
                          <Link
                            to="/"
                            search={{ ticker: item.symbol }}
                            className="hover:text-brand-primary underline decoration-dotted decoration-gray-300 underline-offset-4"
                            title="Inspect DCF Intrinsic Value Assumptions"
                          >
                            {formatPrice(item.intrinsic_value)}
                          </Link>
                        ) : item.iv_status === 'not_applicable' ? (
                          <span
                            className="text-gray-400 font-mono text-[11px]"
                            title="DCF cash flow model is not applicable for ETFs or funds"
                          >
                            N/A
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-mono text-[10px] font-semibold animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                            Calculating...
                          </span>
                        )}
                      </td>

                      {/* 10. Overvalue/undervalue % */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {pct !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isUndervalued
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isFairValue
                                  ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            title={
                              isNegativeIv
                                ? `DCF intrinsic value is negative (${formatPrice(item.intrinsic_value!)}); stock is trading at a premium.`
                                : undefined
                            }
                          >
                            {isUndervalued
                              ? `${pct.toFixed(1)}% Undervalued`
                              : isFairValue
                                ? 'Fair Value'
                                : `${pct.toFixed(1)}% Overvalued`}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action: Delete */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.symbol)}
                          disabled={isRemoving && removingSymbol === item.symbol}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title={`Remove ${item.symbol} from watchlist`}
                        >
                          {isRemoving && removingSymbol === item.symbol ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
