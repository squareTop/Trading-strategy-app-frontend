import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
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
  Search,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useWatchlist, type WatchlistItem } from '../../lib/watchlist'
import { formatFinancial, formatPrice } from '../../lib/utils'
import { TickerAutocomplete } from '../../components/TickerAutocomplete'

export type ValuationFilterType = 'all' | 'undervalued' | 'deep_value' | 'fair_value' | 'overvalued'
export type DrawdownFilterType = 'all' | 'near_high' | 'pullback_10' | 'pullback_20'
export type PerformanceFilterType = 'all' | 'green_day' | 'red_day' | 'green_ytd' | 'green_1y'

export type SortField =
  | 'symbol'
  | 'price'
  | 'day_pct'
  | 'market_cap'
  | 'ps'
  | 'pe'
  | 'ytd'
  | 'one_yr'
  | 'pct_from_52w_high'
  | 'intrinsic_value'
  | 'valuation'

export type SortDirection = 'asc' | 'desc'

export interface WatchlistSearchParams {
  q?: string
  valuation?: ValuationFilterType
  drawdown?: DrawdownFilterType
  momentum?: PerformanceFilterType
  sortBy?: SortField
  sortDir?: SortDirection
}

export const Route = createFileRoute('/(home)/watchlist')({
  validateSearch: (search: Record<string, unknown>): WatchlistSearchParams => ({
    q: (search.q as string) || undefined,
    valuation: (search.valuation as ValuationFilterType) || undefined,
    drawdown: (search.drawdown as DrawdownFilterType) || undefined,
    momentum: (search.momentum as PerformanceFilterType) || undefined,
    sortBy: (search.sortBy as SortField) || undefined,
    sortDir: (search.sortDir as SortDirection) || undefined,
  }),
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

function getItemValuationStatus(item: WatchlistItem) {
  const hasIv = item.intrinsic_value !== null && item.intrinsic_value !== undefined
  const hasPrice = item.price !== null && item.price !== undefined
  const isNegativeIv = hasIv && item.intrinsic_value! <= 0
  const isUndervalued = hasIv && hasPrice && !isNegativeIv && item.intrinsic_value! > item.price!
  const isFairValue = hasIv && hasPrice && !isNegativeIv && item.intrinsic_value! === item.price!
  const isOvervalued = hasIv && hasPrice && (isNegativeIv || item.price! > item.intrinsic_value!)

  // Signed discount percentage: positive = undervalued by X%, negative = overvalued
  let discountPct: number | null = null
  if (hasIv && hasPrice && item.intrinsic_value! !== 0) {
    discountPct = ((item.intrinsic_value! - item.price!) / Math.abs(item.intrinsic_value!)) * 100
  } else if (item.over_under_pct !== null && item.over_under_pct !== undefined) {
    discountPct = -item.over_under_pct * 100
  }

  const isDeepValue = isUndervalued && discountPct !== null && discountPct >= 20

  const absPct = hasIv && hasPrice && item.intrinsic_value! !== 0
    ? Math.abs((item.price! - item.intrinsic_value!) / Math.abs(item.intrinsic_value!)) * 100
    : item.over_under_pct !== null
      ? Math.abs(item.over_under_pct * 100)
      : null

  return {
    hasIv,
    hasPrice,
    isNegativeIv,
    isUndervalued,
    isFairValue,
    isOvervalued,
    isDeepValue,
    discountPct,
    absPct,
  }
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

  // Filter & Search state driven by URL search params
  const search = Route.useSearch()

  const searchQuery = search.q || ''
  const valuationFilter = search.valuation || 'all'
  const drawdownFilter = search.drawdown || 'all'
  const performanceFilter = search.momentum || 'all'
  const sortField = search.sortBy || null
  const sortDirection = search.sortDir || 'desc'

  // Local state for immediate typing feedback
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Keep local search input in sync if URL param changes (e.g., browser back/forward or Reset)
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  // Helper to update URL search parameters
  const updateSearch = (newParams: Partial<WatchlistSearchParams>) => {
    navigate({
      search: (prev) => {
        const merged: Record<string, any> = { ...prev, ...newParams }
        if (!merged.q || !merged.q.trim()) delete merged.q
        if (merged.valuation === 'all' || !merged.valuation) delete merged.valuation
        if (merged.drawdown === 'all' || !merged.drawdown) delete merged.drawdown
        if (merged.momentum === 'all' || !merged.momentum) delete merged.momentum
        if (!merged.sortBy) delete merged.sortBy
        if (!merged.sortDir) delete merged.sortDir
        return merged
      },
      replace: true,
    })
  }

  // Debounce typing in search input to URL query param
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== searchQuery.trim()) {
        updateSearch({ q: searchInput.trim() || undefined })
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery])

  const handleClearSearch = () => {
    setSearchInput('')
    updateSearch({ q: undefined })
  }

  const handleValuationChange = (val: ValuationFilterType) => {
    updateSearch({ valuation: val === 'all' ? undefined : val })
  }

  const handleDrawdownChange = (val: DrawdownFilterType) => {
    updateSearch({ drawdown: val === 'all' ? undefined : val })
  }

  const handlePerformanceChange = (val: PerformanceFilterType) => {
    updateSearch({ momentum: val === 'all' ? undefined : val })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    navigate({
      search: {},
      replace: true,
    })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        updateSearch({ sortBy: field, sortDir: 'asc' })
      } else {
        updateSearch({ sortBy: undefined, sortDir: undefined })
      }
    } else {
      updateSearch({
        sortBy: field,
        sortDir: field === 'symbol' ? 'asc' : 'desc',
      })
    }
  }

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
      valuationFilter !== 'all' ||
      drawdownFilter !== 'all' ||
      performanceFilter !== 'all' ||
      sortField !== null
  )

  // Filtered dataset
  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      // 1. In-table Search filter (symbol or name)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchSymbol = item.symbol.toLowerCase().includes(q)
        const matchName = item.name ? item.name.toLowerCase().includes(q) : false
        if (!matchSymbol && !matchName) return false
      }

      const { isUndervalued, isDeepValue, isFairValue, isOvervalued } = getItemValuationStatus(item)

      // 2. Valuation filter
      if (valuationFilter === 'undervalued' && !isUndervalued) return false
      if (valuationFilter === 'deep_value' && !isDeepValue) return false
      if (valuationFilter === 'fair_value' && !isFairValue) return false
      if (valuationFilter === 'overvalued' && !isOvervalued) return false

      // 3. 52W Drawdown filter
      if (drawdownFilter !== 'all') {
        const highPct = item.pct_from_52w_high
        if (highPct === null || highPct === undefined) return false
        if (drawdownFilter === 'near_high' && highPct < -5) return false
        if (drawdownFilter === 'pullback_10' && highPct > -10) return false
        if (drawdownFilter === 'pullback_20' && highPct > -20) return false
      }

      // 4. Performance filter
      if (performanceFilter === 'green_day' && (item.day_pct ?? 0) <= 0) return false
      if (performanceFilter === 'red_day' && (item.day_pct ?? 0) >= 0) return false
      if (performanceFilter === 'green_ytd' && (item.ytd ?? 0) <= 0) return false
      if (performanceFilter === 'green_1y' && (item.one_yr ?? 0) <= 0) return false

      return true
    })
  }, [watchlist, searchQuery, valuationFilter, drawdownFilter, performanceFilter])

  // Sorted dataset
  const sortedWatchlist = useMemo(() => {
    if (!sortField) return filteredWatchlist

    return [...filteredWatchlist].sort((a, b) => {
      let aVal: any = null
      let bVal: any = null

      switch (sortField) {
        case 'symbol':
          aVal = a.symbol
          bVal = b.symbol
          break
        case 'price':
          aVal = a.price
          bVal = b.price
          break
        case 'day_pct':
          aVal = a.day_pct
          bVal = b.day_pct
          break
        case 'market_cap':
          aVal = a.market_cap
          bVal = b.market_cap
          break
        case 'ps':
          aVal = a.ps
          bVal = b.ps
          break
        case 'pe':
          aVal = a.pe
          bVal = b.pe
          break
        case 'ytd':
          aVal = a.ytd
          bVal = b.ytd
          break
        case 'one_yr':
          aVal = a.one_yr
          bVal = b.one_yr
          break
        case 'pct_from_52w_high':
          aVal = a.pct_from_52w_high
          bVal = b.pct_from_52w_high
          break
        case 'intrinsic_value':
          aVal = a.intrinsic_value
          bVal = b.intrinsic_value
          break
        case 'valuation':
          aVal = getItemValuationStatus(a).discountPct
          bVal = getItemValuationStatus(b).discountPct
          break
      }

      // Place null/undefined/NaN at the bottom regardless of sortDirection
      const aIsNull = aVal === null || aVal === undefined || (typeof aVal === 'number' && Number.isNaN(aVal))
      const bIsNull = bVal === null || bVal === undefined || (typeof bVal === 'number' && Number.isNaN(bVal))

      if (aIsNull && bIsNull) return 0
      if (aIsNull) return 1
      if (bIsNull) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [filteredWatchlist, sortField, sortDirection])

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-0 group-hover/th:opacity-100 transition-opacity ml-1 inline shrink-0" />
      )
    }
    return (
      <span className="text-brand-primary ml-1 text-xs shrink-0">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

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
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all whitespace-nowrap ${alreadyIn
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

      {/* Filter & Search Toolbar (When watchlist has items) */}
      {watchlist.length > 0 && (
        <div className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 mb-6 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. In-Table Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    updateSearch({ q: searchInput.trim() || undefined })
                  }
                }}
                placeholder="Filter ticker or name..."
                className="w-full pl-8 pr-8 py-2 bg-brand-bg/30 border border-brand-border rounded-xl text-xs font-mono text-brand-dark focus:outline-none focus:border-brand-primary focus:bg-white transition-all uppercase placeholder:normal-case placeholder:text-gray-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Valuation Dropdown */}
            <div>
              <select
                value={valuationFilter}
                onChange={(e) => handleValuationChange(e.target.value as ValuationFilterType)}
                className="w-full py-2 px-3 bg-brand-bg/30 border border-brand-border rounded-xl text-xs font-mono text-brand-dark font-semibold focus:outline-none focus:border-brand-primary focus:bg-white transition-all cursor-pointer"
              >
                <option value="all">Valuation: All</option>
                <option value="undervalued">Undervalued Only</option>
                <option value="deep_value">Deep Value (&gt;20% Discount)</option>
                <option value="fair_value">Fair Value</option>
                <option value="overvalued">Overvalued Only</option>
              </select>
            </div>

            {/* 3. 52W High Drawdown Dropdown */}
            <div>
              <select
                value={drawdownFilter}
                onChange={(e) => handleDrawdownChange(e.target.value as DrawdownFilterType)}
                className="w-full py-2 px-3 bg-brand-bg/30 border border-brand-border rounded-xl text-xs font-mono text-brand-dark font-semibold focus:outline-none focus:border-brand-primary focus:bg-white transition-all cursor-pointer"
              >
                <option value="all">52W High: All Ranges</option>
                <option value="near_high">Near 52W High (&lt;5% off)</option>
                <option value="pullback_10">Pullback (-10% or more)</option>
                <option value="pullback_20">Deep Pullback (-20% or more)</option>
              </select>
            </div>

            {/* 4. Performance / Momentum Dropdown */}
            <div>
              <select
                value={performanceFilter}
                onChange={(e) => handlePerformanceChange(e.target.value as PerformanceFilterType)}
                className="w-full py-2 px-3 bg-brand-bg/30 border border-brand-border rounded-xl text-xs font-mono text-brand-dark font-semibold focus:outline-none focus:border-brand-primary focus:bg-white transition-all cursor-pointer"
              >
                <option value="all">Momentum: All</option>
                <option value="green_day">Green Today (+)</option>
                <option value="red_day">Red Today (-)</option>
                <option value="green_ytd">Positive YTD (+)</option>
                <option value="green_1y">Positive 1-Year (+)</option>
              </select>
            </div>
          </div>

          {/* Filter status & counter summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono text-gray-500 border-t border-brand-border/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-dark">{sortedWatchlist.length}</span>
              <span>of</span>
              <span className="font-bold text-brand-dark">{watchlist.length}</span>
              <span>tickers shown</span>
              {isAnyFilterActive && (
                <span className="px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold text-[10px]">
                  Filtered
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {sortField && (
                <span className="text-gray-400">
                  Sorted by <strong className="text-brand-dark uppercase">{sortField.replace(/_/g, ' ')}</strong> (
                  {sortDirection.toUpperCase()})
                </span>
              )}
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-mono font-bold flex items-center gap-1 hover:underline transition-all cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
              <span className="hidden sm:inline text-gray-400">• Click column headers to sort</span>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Table States */}
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
      ) : sortedWatchlist.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-brand-bg text-gray-400 mx-auto flex items-center justify-center mb-3">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-display text-brand-dark">
            No Tickers Match Your Filters
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No watchlist items matched your search query or filter criteria. Try adjusting your filters or resetting them.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-dark text-white hover:bg-brand-primary transition-colors rounded-xl text-xs font-mono font-bold cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
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
                  <th
                    onClick={() => handleSort('symbol')}
                    className="py-3 px-4 min-w-[130px] cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ticker</span>
                      {renderSortIndicator('symbol')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('price')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Price</span>
                      {renderSortIndicator('price')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('day_pct')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Day %</span>
                      {renderSortIndicator('day_pct')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('market_cap')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Market Cap</span>
                      {renderSortIndicator('market_cap')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('ps')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>P/S</span>
                      {renderSortIndicator('ps')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pe')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>P/E</span>
                      {renderSortIndicator('pe')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('ytd')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>% YTD</span>
                      {renderSortIndicator('ytd')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('one_yr')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>% 1Y</span>
                      {renderSortIndicator('one_yr')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pct_from_52w_high')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>% 52W High</span>
                      {renderSortIndicator('pct_from_52w_high')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('intrinsic_value')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Intrinsic Value</span>
                      {renderSortIndicator('intrinsic_value')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('valuation')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-brand-bg/80 hover:text-brand-primary transition-colors group/th select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Valuation</span>
                      {renderSortIndicator('valuation')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {sortedWatchlist.map((item) => {
                  const dayPositive = (item.day_pct ?? 0) >= 0
                  const ytdPositive = (item.ytd ?? 0) >= 0
                  const oneYrPositive = (item.one_yr ?? 0) >= 0

                  const {
                    hasIv,
                    hasPrice,
                    isNegativeIv,
                    isUndervalued,
                    isFairValue,
                    absPct: pct,
                  } = getItemValuationStatus(item)

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
                            className={`inline-flex items-center gap-0.5 ${
                              dayPositive ? 'text-emerald-600' : 'text-rose-600'
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
                        className={`py-3.5 px-3 text-right font-mono font-medium text-[11px] whitespace-nowrap ${
                          ytdPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatPct(item.ytd)}
                      </td>

                      {/* 7. % 1Y */}
                      <td
                        className={`py-3.5 px-3 text-right font-mono font-medium text-[11px] whitespace-nowrap ${
                          oneYrPositive ? 'text-emerald-600' : 'text-rose-600'
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
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isUndervalued
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
