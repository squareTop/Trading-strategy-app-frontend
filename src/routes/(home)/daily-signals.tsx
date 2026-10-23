import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  useTable,
  tableFeatures,
  columnVisibilityFeature,
  rowSortingFeature,
  createSortedRowModel,
  rowPaginationFeature,
  createPaginatedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import {
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  Layers,
  CheckCircle
} from 'lucide-react'
import { formatPercent, formatPrice, formatDate } from '../../lib/utils'
import { API_URL } from '../../lib/config'
import DailySignalsSkeleton from '../../components/skeletons/DailySignalsSkeleton'

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})
const columnHelper = createColumnHelper<typeof features, DailySignal>()

export interface DailySignal {
  id: number;
  ticker: string;
  asset_class: string;
  market: string;
  signal_date: string;
  trigger: string;
  direction: 'long' | 'short';
  entry: number;
  stop: number;
  target: number;
  size: number | null;
  risk_dollars: number | null;
  risk_pct: number | null;
  win_rate: number | null;
  profit_factor: number | null;
  expectancy_r: number | null;
  trade_count: number | null;
  avg_rr: number | null;
  r_to_target: number | null;
  selected_strategy: string | null;
  gate_pass: boolean | null;
  gate_threshold: number | null;
  equity_at_calc: number | null;
  pipeline: string | null;
  schema_version: string | null;
  generated_at_sgt: string | null;
  backtest_asof: string | null;
  // 2026-10-23 (0.8): strategy stage when logged (research | shadow | forward | paper | live)
  stage?: string | null;
  // 2026-10-23 (0.5): latest daily run that checked this signal (generated_at_sgt = first logged)
  last_checked_sgt?: string | null;
}

export interface DailySignalJSONAPI {
  type: string;
  id: string;
  attributes: DailySignal;
}

export interface DailySignalsResponse {
  data: DailySignalJSONAPI[];
  meta: {
    total_scan: number | null;          // 2026-10-23 (0.5): null when no weekly snapshot exists
    last_checked_sgt?: string | null;   // 2026-10-23 (0.5)
  };
}

export const dailySignalsQueryOptions = queryOptions({
  queryKey: ['dailySignals'],
  queryFn: async () => {
    const response = await fetch(`${API_URL}/daily-signals`);
    if (!response.ok) {
      throw new Error(`Failed to fetch daily signals: error status ${response.status}`);
    }
    return response.json() as Promise<DailySignalsResponse>;
  },
  staleTime: 60 * 1000,
})

export const Route = createFileRoute('/(home)/daily-signals')({
  head: () => ({
    meta: [
      {
        title: 'Daily Trading Signals | FoxelSignal',
      },
      {
        name: 'description',
        content: 'Automated quantitative trading signals across Trend, Mean Reversion, and Price Action strategies with 1R equal-risk position sizing.',
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dailySignalsQueryOptions).catch(() => { });
  },
  pendingComponent: DailySignalsSkeleton,
  pendingMs: 50,
  pendingMinMs: 300,
  component: DailySignalsPage,
})

const STRATEGY_TO_PIPELINE: Record<string, string> = {
  // Trend / SMA Crossover
  sma_cross: 'SMA Crossover',
  smooth_trend: 'SMA Crossover',
  high_velocity: 'SMA Crossover',
  bb_trend_ride: 'SMA Crossover',
  bb_breakout: 'SMA Crossover',
  bb_breakout_long: 'SMA Crossover',

  // Mean Reversion
  'MR-A': 'Mean Reversion',
  'MR-A2': 'Mean Reversion',
  'MR-B': 'Mean Reversion',
  mr_a_long: 'Mean Reversion',
  mr_a_short: 'Mean Reversion',
  mrb_short: 'Mean Reversion',

  // Price Action
  fs_continuation: 'Price Action',
  fs_reversal: 'Price Action',
  uc1_dc1: 'Price Action',
  fs_reversal_long: 'Price Action',
  continuation_short: 'Price Action',
  dc1_short: 'Price Action',
  fs_reversal_short: 'Price Action',
}

const PIPELINE_DISPLAY_NAMES: Record<string, string> = {
  trend: 'SMA Crossover',
  mean_rev: 'Mean Reversion',
  price_action: 'Price Action',
}

// 2026-10-23 (0.8): marks a signal from a strategy in the shadow stage. Shadow
// signals fire, are logged and resolve like any other; the scoreboard leaves them
// out of its totals unless "Include shadow" is on.
function ShadowBadge() {
  return (
    <span
      title="Shadow strategy: logged and resolved as usual, but left out of the scoreboard totals"
      className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border border-dashed bg-gray-100 text-gray-600 border-gray-400"
    >
      Shadow
    </span>
  )
}

function DailySignalsPage() {
  const { data: signalsResponse, isLoading, error, refetch } = useQuery(dailySignalsQueryOptions)

  // Map JSON:API data array to normal list of DailySignals
  const signals = useMemo(() => {
    return signalsResponse?.data?.map(item => item.attributes) || []
  }, [signalsResponse])

  // 2026-10-23 (0.5): no invented fallback; null (shown as "—") when there is no weekly snapshot
  const totalScan = signalsResponse?.meta?.total_scan ?? null

  // Local state for table & filters
  const [sorting, setSorting] = useState<SortingState>([])
  const [tickerSearch, setTickerSearch] = useState<string>('')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [pipelineStrategyFilter, setPipelineStrategyFilter] = useState<string>('all')
  // 2026-10-23 (0.8): shadow-stage signals are shown by default; the filter hides them
  const [showShadow, setShowShadow] = useState<boolean>(true)
  const shadowCount = useMemo(() => signals.filter(s => s.stage === 'shadow').length, [signals])

  // Calculate high-level aggregated signals stats
  const stats = useMemo(() => {
    // 2026-10-23 (0.5): the average win rate is gone (it averaged different payoff structures)
    if (!signals || signals.length === 0) {
      return { total: totalScan, longCount: 0, shortCount: 0, passedCount: 0 }
    }

    let longCount = 0
    let passedCount = 0

    signals.forEach(s => {
      if (s.direction === 'long') longCount++
      if (s.gate_pass) passedCount++
    })

    return {
      total: totalScan,
      longCount,
      shortCount: signals.length - longCount,
      passedCount,
    }
  }, [signals, totalScan])

  // Get all unique pipeline/strategy options from the data dynamically
  const pipelineStrategyOptions = useMemo(() => {
    if (!signals) return []
    const optionsSet = new Set<string>()
    signals.forEach(row => {
      const strategyName = row.selected_strategy || (row.trigger ? row.trigger.split(':')[0] : '')
      const pipelineName =
        (strategyName && STRATEGY_TO_PIPELINE[strategyName]) ||
        (row.pipeline && PIPELINE_DISPLAY_NAMES[row.pipeline]) ||
        row.pipeline ||
        'N/A'
      const displayVal = `${pipelineName} / ${strategyName || 'N/A'}`
      optionsSet.add(displayVal)
    })
    return Array.from(optionsSet).sort()
  }, [signals])

  // Custom filter logic
  const filteredData = useMemo(() => {
    if (!signals) return []
    return signals.filter(s => {
      const matchesSearch = s.ticker.toLowerCase().includes(tickerSearch.toLowerCase())
      const matchesDirection = directionFilter === 'all' || s.direction === directionFilter

      const strategyName = s.selected_strategy || (s.trigger ? s.trigger.split(':')[0] : '')
      const pipelineName =
        (strategyName && STRATEGY_TO_PIPELINE[strategyName]) ||
        (s.pipeline && PIPELINE_DISPLAY_NAMES[s.pipeline]) ||
        s.pipeline ||
        'N/A'
      const rowVal = `${pipelineName} / ${strategyName || 'N/A'}`
      const matchesPipelineStrategy = pipelineStrategyFilter === 'all' || rowVal === pipelineStrategyFilter
      const matchesStage = showShadow || s.stage !== 'shadow'   // 2026-10-23 (0.8)

      return matchesSearch && matchesDirection && matchesPipelineStrategy && matchesStage
    })
  }, [signals, tickerSearch, directionFilter, pipelineStrategyFilter, showShadow])

  // Define Columns
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor('ticker', {
      header: 'Ticker',
      cell: info => {
        const ticker = info.getValue()
        return (
          <Link
            to="/"
            search={{ ticker }}
            className="font-mono font-black text-brand-primary hover:text-brand-primary-hover hover:underline flex items-center gap-1 cursor-pointer"
          >
            {ticker}
            <ArrowUpRight className="w-3 h-3 text-brand-primary/60 shrink-0" />
          </Link>
        )
      },
    }),
    columnHelper.accessor('signal_date', {
      header: 'Signal Date',
      cell: info => {
        const val = info.getValue()
        if (!val) return <span className="text-gray-400 font-mono">-</span>
        const formattedDate = new Date(val).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        })
        return <span className="font-mono text-gray-700">{formattedDate}</span>
      },
    }),
    columnHelper.accessor('direction', {
      header: 'Direction',
      cell: info => {
        const dir = info.getValue()
        const isLong = dir === 'long'
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${isLong
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
              }`}
          >
            {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {dir}
          </span>
        )
      },
    }),
    columnHelper.accessor(
      row => {
        const strategyName = row.selected_strategy || (row.trigger ? row.trigger.split(':')[0] : '')
        const pipelineName =
          (strategyName && STRATEGY_TO_PIPELINE[strategyName]) ||
          (row.pipeline && PIPELINE_DISPLAY_NAMES[row.pipeline]) ||
          row.pipeline ||
          'N/A'
        return `${pipelineName} / ${strategyName || 'N/A'}`
      },
      {
        id: 'pipeline_strategy',
        header: 'Pipeline / Strategy',
        cell: info => (
          <>
            <span className="font-mono text-xs text-gray-700 bg-brand-bg px-2 py-0.5 rounded border border-brand-border/60">
              {info.getValue()}
            </span>
            {/* 2026-10-23 (0.8) */}
            {info.row.original.stage === 'shadow' && <ShadowBadge />}
          </>
        ),
      }
    ),
    columnHelper.accessor('entry', {
      header: 'Entry',
      cell: info => <span className="font-mono font-bold text-brand-dark">{formatPrice(info.getValue(), 'USD')}</span>,
    }),
    columnHelper.accessor('stop', {
      header: 'Stop Price',
      cell: info => <span className="font-mono text-red-600">{formatPrice(info.getValue(), 'USD')}</span>,
    }),
    columnHelper.accessor('target', {
      header: 'Target Price',
      cell: info => <span className="font-mono text-emerald-600">{formatPrice(info.getValue(), 'USD')}</span>,
    }),
    // 2026-10-23 (0.5): historical columns retitled, with a tooltip that they are past
    // backtest results for this ticker (not expected results); green highlights removed.
    columnHelper.accessor('win_rate', {
      header: () => <span title="Past backtest result for this ticker — not an expected result">Historical Win Rate (this ticker)</span>,
      cell: info => {
        const val = info.getValue()
        return (
          <span className="font-mono text-gray-700" title="Past backtest result for this ticker — not an expected result">
            {val !== null ? formatPercent(val) : '-'}
          </span>
        )
      },
    }),
    columnHelper.accessor('profit_factor', {
      header: () => <span title="Past backtest result for this ticker — not an expected result">Historical PF (this ticker)</span>,
      cell: info => {
        const val = info.getValue()
        return (
          <span className="font-mono text-gray-700" title="Past backtest result for this ticker — not an expected result">
            {val === null ? '-' : val >= 999 ? 'No losses' : val.toFixed(2)}
          </span>
        )
      },
    }),
    columnHelper.accessor('expectancy_r', {
      header: () => <span title="Past backtest result for this ticker — not an expected result">Historical Exp-R (this ticker)</span>,
      cell: info => {
        const val = info.getValue()
        return (
          <span className="font-mono text-gray-700" title="Past backtest result for this ticker — not an expected result">
            {val !== null ? `${val.toFixed(2)} R` : '-'}
          </span>
        )
      },
    }),
    // 2026-10-23 (0.5): number of backtest trades behind the historical figures
    columnHelper.accessor('trade_count', {
      header: () => <span title="Backtest trades behind the historical figures for this ticker">Trades (this ticker)</span>,
      cell: info => {
        const val = info.getValue()
        return <span className="font-mono text-gray-700">{val ?? '-'}</span>
      },
    }),
  ]), [columnHelper])

  // Instantiate Table
  const table = useTable({
    features,
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  })

  // 2026-10-23 (0.5): "Last checked" = the latest daily run that evaluated the open
  // signals (generated_at_sgt is now each signal's first-logged time).
  const lastChecked = useMemo(() => {
    const fromRows = signals.map(s => s.last_checked_sgt).filter((x): x is string => !!x).sort().pop()
    const latest = signalsResponse?.meta?.last_checked_sgt || fromRows
    return latest ? formatDate(latest, 'Asia/Singapore') : 'N/A'
  }, [signals, signalsResponse])

  const handleResetFilters = () => {
    setTickerSearch('')
    setDirectionFilter('all')
    setPipelineStrategyFilter('all')
    setShowShadow(true)   // 2026-10-23 (0.8)
    setSorting([])
  }

  return (
    <div className="min-h-[calc(100vh-61px)] bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-12 flex flex-col">
      <main className="max-w-360 w-full mx-auto px-4 md:px-8 mt-8 flex-1 flex flex-col justify-between">
        <div className="flex-1">
          {/* Banner Section */}
          <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider block mb-1">
                  Strategy Signal Center
                </span>
                <h1 className="font-display text-2.5xl md:text-3.5xl font-extrabold text-brand-dark tracking-tight leading-none">
                  Daily Algorithmic Scanning
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  Automated strategies scan global indices every 1 hours on working days. Tap any ticker symbol below
                  to jump into its deep corporate valuation.
                </p>
              </div>

              <div className="bg-[#f0eadd] p-4 rounded-xl border border-brand-border/60 shrink-0 text-xs font-mono space-y-2 max-w-sm">
                <div className="flex items-center justify-between gap-6 border-b border-brand-border/50 pb-2">
                  <span className="text-gray-500">Pipeline Status</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-gray-500">Last checked</span>
                  <span className="font-bold text-brand-dark">{lastChecked}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid cards */}
          {!isLoading && !error && signalsResponse && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Layers className="w-4 h-4 text-brand-primary" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Scans</span>
                </div>
                <div>
                  <span className="font-mono text-2xl font-black text-brand-dark">{stats.total ?? '—'}</span>
                  <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Detections loaded</span>
                </div>
              </div>

              <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Long vs Short</span>
                </div>
                <div>
                  <span className="font-mono text-2xl font-black text-brand-dark">
                    {stats.longCount}<span className="text-gray-400 font-normal text-lg">L</span>
                    <span className="text-gray-300 mx-1">/</span>
                    {stats.shortCount}<span className="text-gray-400 font-normal text-lg">S</span>
                  </span>
                  <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Direction bias</span>
                </div>
              </div>

              <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Gate Qualified</span>
                </div>
                <div>
                  <span className="font-mono text-2xl font-black text-emerald-600">
                    {stats.passedCount}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Signals passing gate criteria</span>
                </div>
              </div>
            </div>
          )}

          {/* Global Loading Overlay Screen */}
          {isLoading && (
            <div className="bg-white border border-brand-border rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-12 h-12 rounded-full border-4 border-brand-bg border-t-brand-primary animate-spin mb-4"></div>
              <p className="font-display text-lg font-bold text-brand-dark">
                Loading signal tables & backtest records...
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono uppercase">
                Fetching pipeline data from backend server
              </p>
            </div>
          )}

          {/* Error Boundary Module */}
          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 shadow-xs">
              <div className="flex gap-3">
                <span className="shrink-0 text-xl">⚠️</span>
                <div>
                  <h4 className="font-display text-base font-bold text-red-950">Signals Fetch Failed</h4>
                  <p className="text-sm text-red-800 mt-1">{(error as Error).message}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => refetch()}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                    >
                      Retry Fetch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Toolbar & Data Table */}
          {!isLoading && !error && signalsResponse && (
            <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
              {/* Filter control bar */}
              <div className="p-4 md:p-6 border-b border-brand-border bg-white flex flex-wrap items-center gap-3">
                {/* Text search */}
                <div className="relative max-w-xs w-full sm:w-auto sm:grow-0 grow">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search ticker..."
                    value={tickerSearch}
                    onChange={(e) => setTickerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-brand-bg/20 text-brand-dark font-mono text-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all uppercase"
                  />
                </div>

                {/* Direction Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 hidden sm:inline">
                    Direction:
                  </span>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value)}
                    className="bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-semibold text-gray-700 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/10"
                  >
                    <option value="all">All Directions</option>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>

                {/* Pipeline / Strategy Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 hidden sm:inline">
                    Pipeline / Strategy:
                  </span>
                  <select
                    value={pipelineStrategyFilter}
                    onChange={(e) => setPipelineStrategyFilter(e.target.value)}
                    className="bg-brand-bg/40 border border-brand-border rounded-lg text-xs font-semibold text-gray-700 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/10"
                  >
                    <option value="all">All Pipelines / Strategies</option>
                    {pipelineStrategyOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2026-10-23 (0.8): show / hide shadow-stage signals (shown by default) */}
                <label
                  className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 cursor-pointer select-none"
                  title="Shadow strategies are logged and resolved as usual, but left out of the scoreboard totals"
                >
                  <input
                    type="checkbox"
                    checked={showShadow}
                    onChange={(e) => setShowShadow(e.target.checked)}
                    className="accent-brand-primary cursor-pointer"
                  />
                  Show shadow ({shadowCount})
                </label>

                {/* Reset / Actions */}
                <div className="flex items-center gap-3 sm:ml-auto ml-0">
                  {(tickerSearch || directionFilter !== 'all' || pipelineStrategyFilter !== 'all' || !showShadow || sorting.length > 0) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs text-gray-500 hover:text-brand-primary font-mono font-bold flex items-center gap-1 hover:underline transition-all cursor-pointer whitespace-nowrap"
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    onClick={() => refetch()}
                    className="bg-brand-bg hover:bg-brand-border/40 text-brand-dark p-2 rounded-lg border border-brand-border/80 transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer whitespace-nowrap"
                    title="Refresh signals list"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Results table count indicator */}
              <div className="px-6 py-2.5 bg-brand-bg/30 border-b border-brand-border flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Showing {filteredData.length} of {signals.length} scan targets</span>
                <span className="hidden sm:inline">Click column headers to sort</span>
              </div>

              {/* Responsive Table Wrapper */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto min-w-[1100px]">
                  <thead className="bg-[#f0eadd]/60 border-b border-brand-border">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => {
                          const isSortable = header.column.getCanSort()
                          return (
                            <th
                              key={header.id}
                              className="px-4 py-3 bg-white text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 select-none border-b border-brand-border whitespace-nowrap"
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  onClick={header.column.getToggleSortingHandler()}
                                  className={`flex items-center gap-1 ${isSortable ? 'cursor-pointer hover:text-brand-primary transition-all' : ''
                                    }`}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {isSortable && (
                                    <span className="shrink-0">
                                      {{
                                        asc: ' ▴',
                                        desc: ' ▾',
                                      }[header.column.getIsSorted() as string] ?? (
                                          <ArrowUpDown className="w-3 h-3 opacity-30 inline" />
                                        )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-brand-border/50">
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-brand-primary/5 transition-all ${index % 2 === 1 ? 'bg-brand-bg/30' : 'bg-white'
                            }`}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-4 py-3.5 text-xs text-brand-dark whitespace-nowrap">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-6 py-12 text-center text-gray-400 font-mono text-xs"
                        >
                          No active scan detections matching target filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {table.getPageCount() > 1 && (
                <div className="px-4 py-4 md:px-6 border-t border-brand-border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-mono text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Show:</span>
                    <select
                      value={table.state.pagination.pageSize}
                      onChange={e => {
                        table.setPageSize(Number(e.target.value))
                      }}
                      className="bg-brand-bg/50 border border-brand-border rounded-lg text-xs font-semibold px-2.5 py-1 focus:outline-hidden"
                    >
                      {[10, 20, 30, 40, 50].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                          {pageSize} rows
                        </option>
                      ))}
                    </select>
                    <span>
                      Page {table.state.pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="p-2 rounded-lg border border-brand-border/60 hover:bg-brand-bg transition-all disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-brand-dark" />
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="p-2 rounded-lg border border-brand-border/60 hover:bg-brand-bg transition-all disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-brand-dark" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
