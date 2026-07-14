import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Layers,
  CheckCircle,
  Activity,
  Award,
  TrendingUp as SpyIcon,
  SlidersHorizontal,
  HelpCircle,
  Clock
} from 'lucide-react'
import { formatPercent, formatPrice } from '../../lib/utils'
import { API_URL } from '../../lib/config'

export interface ScorecardRow {
  pipeline: string;
  resolved: number;
  open: number;
  win_rate: number;
  expectancy_r: number;
  profit_factor: number;
  total_r: number;
  backtest_exp_r: number;
  avg_trade_return: number;
  avg_spy_return: number;
  excess_return: number;
}

export interface ScoreboardSignal {
  id: number;
  ticker: string;
  pipeline: string;
  direction: 'long' | 'short';
  status: 'target' | 'stop' | 'expired' | 'open';
  entry: number;
  exit_price: number | null;
  realized_r: number | null;
  trade_return: number | null;
  spy_return: number | null;
  excess_return: number | null;
  signal_date: string;
  resolved_date: string | null;
  bars_held: number | null;
  selected_strategy: string | null;
}

export interface ScoreboardResponse {
  scorecard: ScorecardRow[];
  resolved_signals: ScoreboardSignal[];
  open_signals: ScoreboardSignal[];
}

export const scoreboardQueryOptions = queryOptions({
  queryKey: ['scoreboard'],
  queryFn: async () => {
    const response = await fetch(`${API_URL}/api/scoreboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch scoreboard: error status ${response.status}`);
    }
    return response.json() as Promise<ScoreboardResponse>;
  }
})

export const Route = createFileRoute('/(home)/scoreboard')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(scoreboardQueryOptions).catch(() => { });
  },
  component: ScoreboardPage,
})

const PIPELINE_DISPLAY_NAMES: Record<string, string> = {
  trend: 'SMA Crossover',
  mean_rev: 'Mean Reversion',
  price_action: 'Price Action',
  ALL: 'All Pipelines'
}

function ScoreboardPage() {
  const { data, isLoading, error, refetch } = useQuery(scoreboardQueryOptions)
  const [activeTab, setActiveTab] = useState<'resolved' | 'open'>('resolved')

  // Local table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [tickerSearch, setTickerSearch] = useState<string>('')
  const [pipelineFilter, setPipelineFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')

  // Calculate high-level stats from scorecard ALL row
  const overallStats = useMemo(() => {
    if (!data?.scorecard) return null;
    const allRow = data.scorecard.find(row => row.pipeline === 'ALL');
    return allRow || null;
  }, [data])

  const filteredResolved = useMemo(() => {
    if (!data?.resolved_signals) return []
    return data.resolved_signals.filter(s => {
      const matchesSearch = s.ticker.toLowerCase().includes(tickerSearch.toLowerCase())
      const matchesPipeline = pipelineFilter === 'all' || s.pipeline === pipelineFilter
      const matchesDirection = directionFilter === 'all' || s.direction === directionFilter
      return matchesSearch && matchesPipeline && matchesDirection
    })
  }, [data, tickerSearch, pipelineFilter, directionFilter])

  const filteredOpen = useMemo(() => {
    if (!data?.open_signals) return []
    return data.open_signals.filter(s => {
      const matchesSearch = s.ticker.toLowerCase().includes(tickerSearch.toLowerCase())
      const matchesPipeline = pipelineFilter === 'all' || s.pipeline === pipelineFilter
      const matchesDirection = directionFilter === 'all' || s.direction === directionFilter
      return matchesSearch && matchesPipeline && matchesDirection
    })
  }, [data, tickerSearch, pipelineFilter, directionFilter])

  // React Table Columns for Resolved Signals
  const resolvedColumnHelper = createColumnHelper<ScoreboardSignal>()
  const resolvedColumns = useMemo(() => [
    resolvedColumnHelper.accessor('ticker', {
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
    resolvedColumnHelper.accessor('pipeline', {
      header: 'Pipeline',
      cell: info => (
        <span className="font-mono text-xs text-gray-700 bg-brand-bg px-2 py-0.5 rounded border border-brand-border/60">
          {PIPELINE_DISPLAY_NAMES[info.getValue()] || info.getValue()}
        </span>
      ),
    }),
    resolvedColumnHelper.accessor('direction', {
      header: 'Dir',
      cell: info => {
        const dir = info.getValue()
        const isLong = dir === 'long'
        return (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${isLong
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
              }`}
          >
            {dir}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('status', {
      header: 'Outcome',
      cell: info => {
        const status = info.getValue()
        let badgeStyle = ''
        if (status === 'target') badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
        else if (status === 'stop') badgeStyle = 'bg-red-100 text-red-800 border-red-300'
        else badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300'
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeStyle}`}>
            {status}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('entry', {
      header: 'Entry',
      cell: info => <span className="font-mono text-brand-dark">{formatPrice(info.getValue())}</span>,
    }),
    resolvedColumnHelper.accessor('exit_price', {
      header: 'Exit',
      cell: info => {
        const val = info.getValue()
        return <span className="font-mono text-brand-dark">{val !== null ? formatPrice(val) : '-'}</span>
      },
    }),
    resolvedColumnHelper.accessor('realized_r', {
      header: 'Realized R',
      cell: info => {
        const val = info.getValue()
        if (val === null) return <span className="font-mono text-gray-400">-</span>
        const isPos = val > 0
        return (
          <span className={`font-mono font-bold ${isPos ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPos ? `+${val.toFixed(2)} R` : `${val.toFixed(2)} R`}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('trade_return', {
      header: 'Trade Return',
      cell: info => {
        const val = info.getValue()
        if (val === null) return <span className="font-mono text-gray-400">-</span>
        const isPos = val > 0
        return (
          <span className={`font-mono font-bold ${isPos ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPos ? `+${formatPercent(val)}` : formatPercent(val)}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('spy_return', {
      header: 'SPY Return',
      cell: info => {
        const val = info.getValue()
        if (val === null) return <span className="font-mono text-gray-400">-</span>
        const isPos = val > 0
        return (
          <span className="font-mono text-gray-600">
            {isPos ? `+${formatPercent(val)}` : formatPercent(val)}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('excess_return', {
      header: 'vs SPY (Alpha)',
      cell: info => {
        const val = info.getValue()
        if (val === null) return <span className="font-mono text-gray-400">-</span>
        const isPos = val > 0
        return (
          <span className={`font-mono font-black ${isPos ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPos ? `+${formatPercent(val)}` : formatPercent(val)}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('signal_date', {
      header: 'Signaled',
      cell: info => <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>,
    }),
    resolvedColumnHelper.accessor('resolved_date', {
      header: 'Resolved',
      cell: info => <span className="font-mono text-xs text-gray-500">{info.getValue() || '-'}</span>,
    }),
    resolvedColumnHelper.accessor('bars_held', {
      header: 'Bars',
      cell: info => <span className="font-mono text-xs text-gray-600">{info.getValue() ?? '-'}</span>,
    }),
  ], [resolvedColumnHelper])

  // React Table Columns for Open Signals
  const openColumnHelper = createColumnHelper<ScoreboardSignal>()
  const openColumns = useMemo(() => [
    openColumnHelper.accessor('ticker', {
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
    openColumnHelper.accessor('pipeline', {
      header: 'Pipeline',
      cell: info => (
        <span className="font-mono text-xs text-gray-700 bg-brand-bg px-2 py-0.5 rounded border border-brand-border/60">
          {PIPELINE_DISPLAY_NAMES[info.getValue()] || info.getValue()}
        </span>
      ),
    }),
    openColumnHelper.accessor('direction', {
      header: 'Dir',
      cell: info => {
        const dir = info.getValue()
        const isLong = dir === 'long'
        return (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${isLong
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
              }`}
          >
            {dir}
          </span>
        )
      },
    }),
    openColumnHelper.accessor('entry', {
      header: 'Entry Price',
      cell: info => <span className="font-mono text-brand-dark">{formatPrice(info.getValue())}</span>,
    }),
    openColumnHelper.accessor('signal_date', {
      header: 'Signal Date',
      cell: info => <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>,
    }),
    openColumnHelper.accessor('bars_held', {
      header: 'Bars Held',
      cell: info => <span className="font-mono text-xs text-gray-600">{info.getValue() ?? '-'}</span>,
    }),
  ], [openColumnHelper])

  // Instantiate Tables
  const resolvedTable = useReactTable({
    data: filteredResolved,
    columns: resolvedColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  })

  const openTable = useReactTable({
    data: filteredOpen,
    columns: openColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  })

  const activeTable = activeTab === 'resolved' ? resolvedTable : openTable
  const activeFilteredDataCount = activeTab === 'resolved' ? filteredResolved.length : filteredOpen.length

  const handleResetFilters = () => {
    setTickerSearch('')
    setPipelineFilter('all')
    setDirectionFilter('all')
    setSorting([])
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      <main className="max-w-360 mx-auto px-4 md:px-8 mt-8">

        {/* Banner Section */}
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider block mb-1">
                Forward-Test Scorecard
              </span>
              <h1 className="font-display text-2.5xl md:text-3.5xl font-extrabold text-brand-dark tracking-tight leading-none">
                Scoreboard & Performance
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Evaluate live, forward-test daily strategy signals and measure their actual closed PnL. We benchmark all closed strategies directly against SPY buy-and-hold returns over corresponding holding periods.
              </p>
            </div>

            <div className="bg-[#f0eadd] p-4 rounded-xl border border-brand-border/60 shrink-0 text-xs font-mono space-y-2 max-w-sm">
              <div className="flex items-center justify-between gap-6 border-b border-brand-border/50 pb-2">
                <span className="text-gray-500">Scorecard Mode</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-500">Constraint</span>
                <span className="font-bold text-brand-dark">One-Position-Per-Ticker</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="bg-white border border-brand-border rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-12 h-12 rounded-full border-4 border-brand-bg border-t-brand-primary animate-spin mb-4"></div>
            <p className="font-display text-lg font-bold text-brand-dark">
              Analyzing scoreboard and historical trades...
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono uppercase">
              Fetching and calculating SPY benchmarks
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 shadow-xs mb-8">
            <div className="flex gap-3">
              <span className="shrink-0 text-xl">⚠️</span>
              <div>
                <h4 className="font-display text-base font-bold text-red-950">Scoreboard Fetch Failed</h4>
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

        {!isLoading && !error && data && (
          <>
            {/* KPI Stats Grid */}
            {overallStats && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <CheckCircle className="w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Resolved Trades</span>
                  </div>
                  <div>
                    <span className="font-mono text-2xl font-black text-brand-dark">{overallStats.resolved}</span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Completed signals</span>
                  </div>
                </div>

                <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Open Positions</span>
                  </div>
                  <div>
                    <span className="font-mono text-2xl font-black text-brand-dark">{overallStats.open}</span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Currently active</span>
                  </div>
                </div>

                <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Award className="w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Avg Trade Return</span>
                  </div>
                  <div>
                    <span className={`font-mono text-2xl font-black ${overallStats.avg_trade_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {overallStats.avg_trade_return >= 0 ? '+' : ''}{formatPercent(overallStats.avg_trade_return)}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Average position PnL</span>
                  </div>
                </div>

                <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <SpyIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Avg SPY Return</span>
                  </div>
                  <div>
                    <span className={`font-mono text-2xl font-black ${overallStats.avg_spy_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {overallStats.avg_spy_return >= 0 ? '+' : ''}{formatPercent(overallStats.avg_spy_return)}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Market return benchmark</span>
                  </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Activity className="w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Alpha (vs SPY)</span>
                  </div>
                  <div>
                    <span className={`font-mono text-2xl font-black ${overallStats.excess_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {overallStats.excess_return >= 0 ? '+' : ''}{formatPercent(overallStats.excess_return)}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Market outperformance</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scorecard Rollup Section */}
            <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs mb-8">
              <h2 className="font-display text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-primary" />
                Pipeline Rollup Summary
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono table-auto min-w-[950px]">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-bg text-gray-500 uppercase text-[10px] whitespace-nowrap">
                      <th className="py-3 px-4 font-bold">Pipeline</th>
                      <th className="py-3 px-4 text-right font-bold">Resolved</th>
                      <th className="py-3 px-4 text-right font-bold">Open</th>
                      <th className="py-3 px-4 text-right font-bold">Win Rate</th>
                      <th className="py-3 px-4 text-right font-bold">Realized Exp-R</th>
                      <th className="py-3 px-4 text-right font-bold">Profit Factor</th>
                      <th className="py-3 px-4 text-right font-bold">Total R</th>
                      <th className="py-3 px-4 text-right font-bold">Backtest Exp-R</th>
                      <th className="py-3 px-4 text-right font-bold">Avg Return</th>
                      <th className="py-3 px-4 text-right font-bold">Avg SPY</th>
                      <th className="py-3 px-4 text-right font-bold">Alpha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scorecard.map((row) => {
                      const isAll = row.pipeline === 'ALL'
                      return (
                        <tr
                          key={row.pipeline}
                          className={`border-b border-brand-border/60 hover:bg-brand-bg/30 transition-colors whitespace-nowrap ${
                            isAll ? 'bg-brand-bg/60 font-bold border-t-2 border-brand-dark/80' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-sans font-bold">
                            {PIPELINE_DISPLAY_NAMES[row.pipeline] || row.pipeline}
                          </td>
                          <td className="py-3 px-4 text-right">{row.resolved}</td>
                          <td className="py-3 px-4 text-right">{row.open}</td>
                          <td className="py-3 px-4 text-right">
                            {row.resolved > 0 ? formatPercent(row.win_rate) : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${row.expectancy_r >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.resolved > 0 ? `${row.expectancy_r >= 0 ? '+' : ''}${row.expectancy_r.toFixed(2)} R` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {row.resolved > 0 ? row.profit_factor.toFixed(2) : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${row.total_r >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.resolved > 0 ? `${row.total_r >= 0 ? '+' : ''}${row.total_r.toFixed(1)} R` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-500">
                            {row.resolved > 0 ? `${row.backtest_exp_r >= 0 ? '+' : ''}${row.backtest_exp_r.toFixed(2)} R` : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${row.avg_trade_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.resolved > 0 ? `${row.avg_trade_return >= 0 ? '+' : ''}${formatPercent(row.avg_trade_return)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {row.resolved > 0 ? `${row.avg_spy_return >= 0 ? '+' : ''}${formatPercent(row.avg_spy_return)}` : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-black ${row.excess_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.resolved > 0 ? `${row.excess_return >= 0 ? '+' : ''}${formatPercent(row.excess_return)}` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* List Details tabs */}
            <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-brand-border/60 pb-4 mb-6 gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setActiveTab('resolved'); handleResetFilters(); }}
                    className={`px-4 py-2 rounded-lg font-display text-sm font-bold uppercase tracking-wider transition-all border border-solid ${
                      activeTab === 'resolved'
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white text-gray-600 hover:text-brand-primary border-brand-border'
                    }`}
                  >
                    Resolved Signals ({data.resolved_signals.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('open'); handleResetFilters(); }}
                    className={`px-4 py-2 rounded-lg font-display text-sm font-bold uppercase tracking-wider transition-all border border-solid ${
                      activeTab === 'open'
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white text-gray-600 hover:text-brand-primary border-brand-border'
                    }`}
                  >
                    Open Positions ({data.open_signals.length})
                  </button>
                </div>

                {/* Filter and Search Panel */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Ticker..."
                      value={tickerSearch}
                      onChange={e => setTickerSearch(e.target.value)}
                      className="bg-brand-bg border border-brand-border rounded-lg pl-9 pr-4 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-brand-bg px-2.5 py-1.5 rounded-lg border border-brand-border">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={pipelineFilter}
                      onChange={e => setPipelineFilter(e.target.value)}
                      className="bg-transparent border-0 text-xs font-mono font-bold text-gray-600 focus:outline-hidden focus:ring-0 p-0"
                    >
                      <option value="all">All Pipelines</option>
                      <option value="trend">SMA Crossover</option>
                      <option value="mean_rev">Mean Reversion</option>
                      <option value="price_action">Price Action</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-brand-bg px-2.5 py-1.5 rounded-lg border border-brand-border">
                    <select
                      value={directionFilter}
                      onChange={e => setDirectionFilter(e.target.value)}
                      className="bg-transparent border-0 text-xs font-mono font-bold text-gray-600 focus:outline-hidden focus:ring-0 p-0"
                    >
                      <option value="all">All Directions</option>
                      <option value="long">Longs Only</option>
                      <option value="short">Shorts Only</option>
                    </select>
                  </div>

                  {(tickerSearch || pipelineFilter !== 'all' || directionFilter !== 'all') && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs font-mono text-red-500 hover:text-red-700 hover:underline uppercase font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table rendering */}
              {activeFilteredDataCount === 0 ? (
                <div className="py-12 text-center">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="font-display font-bold text-gray-600">No matching signals found</p>
                  <p className="text-xs text-gray-400 mt-0.5">Try resetting search or filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full text-left border-collapse text-xs font-mono table-auto ${activeTab === 'resolved' ? 'min-w-[1150px]' : 'min-w-[700px]'}`}>
                    <thead>
                      {activeTable.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id} className="border-b border-brand-border bg-brand-bg text-gray-500 uppercase text-[10px] whitespace-nowrap">
                          {headerGroup.headers.map((header, index) => (
                            <th
                              key={header.id}
                              colSpan={header.colSpan}
                              className="py-3 px-4 font-bold select-none cursor-pointer hover:bg-brand-border/40 transition-colors whitespace-nowrap"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className={`flex items-center gap-1.5 ${index === 0 ? 'justify-start' : 'justify-center'}`}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && <ArrowUpDown className="w-3 h-3 text-gray-400 shrink-0" />}
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {activeTable.getRowModel().rows.map(row => (
                        <tr key={row.id} className="border-b border-brand-border/60 hover:bg-brand-bg/30 transition-colors whitespace-nowrap">
                          {row.getVisibleCells().map((cell, index) => (
                            <td key={cell.id} className={`py-3.5 px-4 whitespace-nowrap ${index === 0 ? 'text-left' : 'text-center'}`}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination control footer */}
                  <div className="flex items-center justify-between border-t border-brand-border/60 pt-4 mt-4 text-xs text-gray-500">
                    <div>
                      Showing{' '}
                      <span className="font-bold text-brand-dark">
                        {activeTable.getState().pagination.pageIndex * activeTable.getState().pagination.pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-bold text-brand-dark">
                        {Math.min(
                          (activeTable.getState().pagination.pageIndex + 1) * activeTable.getState().pagination.pageSize,
                          activeFilteredDataCount
                        )}
                      </span>{' '}
                      of <span className="font-bold text-brand-dark">{activeFilteredDataCount}</span> results
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => activeTable.previousPage()}
                        disabled={!activeTable.getCanPreviousPage()}
                        className="p-1.5 rounded-lg border border-brand-border bg-white hover:bg-brand-bg/40 text-gray-500 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => activeTable.nextPage()}
                        disabled={!activeTable.getCanNextPage()}
                        className="p-1.5 rounded-lg border border-brand-border bg-white hover:bg-brand-bg/40 text-gray-500 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
