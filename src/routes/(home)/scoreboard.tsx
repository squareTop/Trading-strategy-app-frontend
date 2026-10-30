import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
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

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Calendar,
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
import ScoreboardSkeleton from '../../components/skeletons/ScoreboardSkeleton'

// 2026-10-26 (2.6): R1+ rows are net of the round-trip cost and measured from the
// next-open fill; ROI is the sum of R x the standard 0.5% risk per trade.
const RISK_PER_TRADE = 0.005
function isR1(v?: string | null): boolean {
  const m = /^R(\d+)$/.exec(v || '')
  return !!m && parseInt(m[1], 10) >= 1
}

function computeBucket(resolvedList: ScoreboardSignal[], openList: ScoreboardSignal[], label: string): ScorecardRow {
  const n = resolvedList.length;
  if (n === 0) {
    return {
      pipeline: label,
      resolved: 0,
      open: openList.length,
      win_rate: 0.0,
      expectancy_r: 0.0,
      profit_factor: 0.0,
      total_r: 0.0,
      backtest_exp_r: 0.0,
      roi: 0.0,          // 2026-10-26 (2.6)
      backtest_n: 0,
      avg_trade_return: 0.0,
      avg_spy_return: 0.0,
      excess_return: 0.0,
    };
  }
  const rs = resolvedList.map(s => s.realized_r).filter((x): x is number => x !== null);
  const wins = rs.filter(x => x > 0);
  const grossWin = rs.filter(x => x > 0).reduce((a, b) => a + b, 0);
  const grossLoss = -rs.filter(x => x < 0).reduce((a, b) => a + b, 0);
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999.0 : 0.0;
  const tradeReturns = resolvedList.map(s => s.trade_return).filter((x): x is number => x !== null);
  const spyReturns = resolvedList.map(s => s.spy_return).filter((x): x is number => x !== null);
  const excessReturns = resolvedList.map(s => s.excess_return).filter((x): x is number => x !== null);
  // 2026-10-26 (2.6): backtest Exp-R from R1 rows only (same unit as Mean R since 2.1c)
  const btR1 = resolvedList.filter(s => isR1(s.ruleset_version)).map(s => s.expectancy_r)
    .filter((x): x is number => x !== null && x !== undefined);

  return {
    pipeline: label,
    resolved: n,
    open: openList.length,
    win_rate: wins.length / n,
    expectancy_r: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0.0,
    profit_factor: pf,
    total_r: rs.reduce((a, b) => a + b, 0),
    backtest_exp_r: btR1.length ? btR1.reduce((a, b) => a + b, 0) / btR1.length : 0.0,   // 2026-10-26 (2.6)
    backtest_n: btR1.length,
    roi: rs.reduce((a, b) => a + b, 0) * RISK_PER_TRADE,
    avg_trade_return: tradeReturns.length ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length : 0.0,
    avg_spy_return: spyReturns.length ? spyReturns.reduce((a, b) => a + b, 0) / spyReturns.length : 0.0,
    excess_return: excessReturns.length ? excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length : 0.0,
  };
}

// 2026-10-23 (0.5): a profit factor of 999 means "no losing trades yet", not a ratio
function formatPF(pf: number): string {
  return pf >= 999 ? 'No losses' : pf.toFixed(2)
}

function formatMonthLabel(yyyymm: string): string {
  if (yyyymm === 'all') return 'All Time';
  const [yearStr, monthStr] = yyyymm.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return yyyymm;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

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
  roi?: number;          // 2026-10-26 (2.6): sum of R x 0.5%, as a fraction of equity
  backtest_n?: number;   // 2026-10-26 (2.6): R1 rows behind backtest_exp_r
}

export interface ScoreboardSignal {
  id: number;
  ticker: string;
  pipeline: string;
  direction: 'long' | 'short';
  status: 'target' | 'stop' | 'expired' | 'exit' | 'open';   // 2026-10-30 (3.2-4): 'exit' = own-signal exit (R2)
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
  // 2026-10-23 (0.8): strategy stage when logged; benchmark is "SPY" (longs) or "cash" (shorts)
  stage?: string | null;
  benchmark?: string | null;
  // 2026-10-26 (2.6): R1 fields used by the net metrics
  ruleset_version?: string | null;
  expectancy_r?: number | null;
  fill_price?: number | null;
  fill_date?: string | null;
  net?: boolean;
}

export interface ScoreboardResponse {
  scorecard: ScorecardRow[];
  resolved_signals: ScoreboardSignal[];
  open_signals: ScoreboardSignal[];
  shadow_strategies?: ScorecardRow[];   // 2026-10-23 (0.8)
  // 2026-10-23 (0.4/0.5): ruleset filter in force and every version in the log
  meta?: {
    ruleset: string | null;
    ruleset_versions: string[];
    include_shadow?: boolean;
    net_basis?: boolean;        // 2026-10-26 (2.6)
    risk_per_trade?: number;    // 2026-10-26 (2.6)
  };
}

// 2026-10-23 (0.5): one query per ruleset filter ("all" = no filter)
export const scoreboardQueryOptionsFor = (ruleset: string) => queryOptions({
  queryKey: ['scoreboard', ruleset],
  queryFn: async () => {
    const qs = ruleset && ruleset !== 'all' ? `?ruleset=${encodeURIComponent(ruleset)}` : ''
    const response = await fetch(`${API_URL}/api/scoreboard${qs}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch scoreboard: error status ${response.status}`);
    }
    return response.json() as Promise<ScoreboardResponse>;
  },
  staleTime: 60 * 1000,
})

export const scoreboardQueryOptions = scoreboardQueryOptionsFor('all')

export const Route = createFileRoute('/(home)/scoreboard')({
  head: () => ({
    meta: [
      {
        title: 'Strategy Performance Scoreboard | FoxelSignal',
      },
      {
        name: 'description',
        content: 'Audited strategy performance tracking, trade expectancy metrics, win rates, and benchmark comparisons across FoxelSignal trading pipelines.',
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(scoreboardQueryOptions).catch(() => { });
  },
  pendingComponent: ScoreboardSkeleton,
  pendingMs: 50,
  pendingMinMs: 300,
  component: ScoreboardPage,
})

const PIPELINE_DISPLAY_NAMES: Record<string, string> = {
  trend: 'SMA Crossover',
  mean_rev: 'Mean Reversion',
  price_action: 'Price Action',
  // 2026-10-30 (3.2-4): from R2 the label is the strategy's style
  trend_following: 'Trend following',
  breakout: 'Breakout',
  mean_reversion: 'Mean reversion',
  pullback: 'Pullback',
  failed_breakout: 'Failed breakout',
  momentum: 'Momentum',
  event_driven: 'Event driven',
  ALL: 'All Pipelines'
}
const R1_PIPELINES = ['trend', 'mean_rev', 'price_action']

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

// 2026-10-26 (2.6): ROI and Backtest Exp-R cells, shared by every scorecard table
function NetCells({ r, className }: { r: ScorecardRow; className: string }) {
  const roi = r.roi ?? 0
  const bt = r.backtest_n ? r.backtest_exp_r : null
  return (
    <>
      <td className={`${className} ${roi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
        title="Sum of R x 0.5% risk per trade, as % of equity, not compounded">
        {r.resolved > 0 ? `${roi >= 0 ? '+' : ''}${formatPercent(roi)}` : '-'}
      </td>
      <td className={className} title="Mean net R of the shared-simulator backtest behind these signals (R1 rows only)">
        {bt !== null && bt !== undefined ? `${bt >= 0 ? '+' : ''}${bt.toFixed(2)} R` : '-'}
      </td>
    </>
  )
}

function ScoreboardPage() {
  // 2026-10-23 (0.5): ruleset filter fed by the API's version list, default all
  const [ruleset, setRuleset] = useState<string>('all')
  const { data, isLoading, error, refetch } = useQuery({
    ...scoreboardQueryOptionsFor(ruleset),
    placeholderData: prev => prev,   // keep the page while another ruleset loads
  })
  const [activeTab, setActiveTab] = useState<'resolved' | 'open'>('resolved')

  // Local table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [tickerSearch, setTickerSearch] = useState<string>('')
  const [pipelineFilter, setPipelineFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')

  // Month & Strategy Expansion State
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [expandedPipelines, setExpandedPipelines] = useState<Record<string, boolean>>({})
  // 2026-10-23 (0.8): shadow-stage signals are left out of the totals unless this is on
  const [includeShadow, setIncludeShadow] = useState<boolean>(false)

  const togglePipelineExpand = (pipelineKey: string) => {
    setExpandedPipelines(prev => ({
      ...prev,
      [pipelineKey]: !prev[pipelineKey]
    }))
  }

  // Derive unique available months (YYYY-MM)
  const availableMonths = useMemo(() => {
    if (!data) return []
    const allSignals = [...(data.resolved_signals || []), ...(data.open_signals || [])]
    const monthsSet = new Set<string>()
    allSignals.forEach(s => {
      if (s.signal_date) {
        const yyyymm = s.signal_date.slice(0, 7)
        if (/^\d{4}-\d{2}$/.test(yyyymm)) {
          monthsSet.add(yyyymm)
        }
      }
    })
    return Array.from(monthsSet).sort().reverse()
  }, [data])

  // Signals filtered by active month selection
  const monthFilteredResolved = useMemo(() => {
    if (!data?.resolved_signals) return []
    if (monthFilter === 'all') return data.resolved_signals
    return data.resolved_signals.filter(s => s.signal_date?.startsWith(monthFilter))
  }, [data, monthFilter])

  const monthFilteredOpen = useMemo(() => {
    if (!data?.open_signals) return []
    if (monthFilter === 'all') return data.open_signals
    return data.open_signals.filter(s => s.signal_date?.startsWith(monthFilter))
  }, [data, monthFilter])

  // Dynamic scorecard calculation including sub-strategy breakdown
  const dynamicScorecardData = useMemo(() => {
    if (!data) return { pipelines: [], allRow: null, shadowRows: [] as ScorecardRow[], shadowCount: 0 }

    // 2026-10-23 (0.8): shadow-stage signals stay out of the pipeline rows and the
    // totals unless "Include shadow" is on; they get their own section below.
    const isShadow = (s: ScoreboardSignal) => s.stage === 'shadow'
    const resolved = includeShadow ? monthFilteredResolved : monthFilteredResolved.filter(s => !isShadow(s))
    const open = includeShadow ? monthFilteredOpen : monthFilteredOpen.filter(s => !isShadow(s))

    const pipeKeys = Array.from(
      new Set([...resolved.map(s => s.pipeline), ...open.map(s => s.pipeline)].filter(Boolean))
    ).sort()

    const pipelineRows = pipeKeys.map(p => {
      const pipeResolved = resolved.filter(s => s.pipeline === p)
      const pipeOpen = open.filter(s => s.pipeline === p)

      const stratNames = Array.from(
        new Set([
          ...pipeResolved.map(s => s.selected_strategy || 'Default Strategy'),
          ...pipeOpen.map(s => s.selected_strategy || 'Default Strategy')
        ])
      ).sort()

      const strategyRows = stratNames.map(strat => {
        const stratResolved = pipeResolved.filter(s => (s.selected_strategy || 'Default Strategy') === strat)
        const stratOpen = pipeOpen.filter(s => (s.selected_strategy || 'Default Strategy') === strat)
        return {
          strategyName: strat,
          bucket: computeBucket(stratResolved, stratOpen, strat)
        }
      })

      return {
        pipeline: p,
        bucket: computeBucket(pipeResolved, pipeOpen, p),
        strategies: strategyRows
      }
    })

    const allRow = computeBucket(resolved, open, 'ALL')

    // 2026-10-23 (0.8): one row per shadow strategy and direction, same columns
    const shadowResolved = monthFilteredResolved.filter(isShadow)
    const shadowOpen = monthFilteredOpen.filter(isShadow)
    const shadowKey = (s: ScoreboardSignal) => `${s.selected_strategy || 'Default Strategy'} ${s.direction}`
    const shadowRows = Array.from(new Set([...shadowResolved, ...shadowOpen].map(shadowKey))).sort().map(k =>
      computeBucket(shadowResolved.filter(s => shadowKey(s) === k), shadowOpen.filter(s => shadowKey(s) === k), k)
    )

    return {
      pipelines: pipelineRows,
      allRow,
      shadowRows,
      shadowCount: shadowResolved.length + shadowOpen.length
    }
  }, [data, monthFilteredResolved, monthFilteredOpen, includeShadow])

  // Overall stats for KPI grid (dynamically reflects month filter)
  const overallStats = dynamicScorecardData.allRow

  // 2026-10-26 (2.6): "(net)" on the headers when every row on the page is R1+;
  // a note when R1 (net, from the fill) and pre-R1 (gross, from the close) rows mix.
  const { netBasis, mixedBasis } = useMemo(() => {
    const all = [...(data?.resolved_signals || []), ...(data?.open_signals || [])]
    const r1 = all.filter(s => isR1(s.ruleset_version)).length
    return { netBasis: all.length > 0 && r1 === all.length, mixedBasis: r1 > 0 && r1 < all.length }
  }, [data])
  const net = netBasis ? ' (net)' : ''
  // 2026-10-30 (3.2-4): R2 labels (styles) present in the log, for the filter
  const styleOptions = useMemo(() => {
    const all = [...(data?.resolved_signals || []), ...(data?.open_signals || [])]
    return Array.from(new Set(all.map(s => s.pipeline).filter(p => p && !R1_PIPELINES.includes(p)))).sort()
  }, [data])

  const filteredResolved = useMemo(() => {
    return monthFilteredResolved.filter(s => {
      const matchesSearch = s.ticker.toLowerCase().includes(tickerSearch.toLowerCase())
      const matchesPipeline = pipelineFilter === 'all' || s.pipeline === pipelineFilter
      const matchesDirection = directionFilter === 'all' || s.direction === directionFilter
      return matchesSearch && matchesPipeline && matchesDirection
    })
  }, [monthFilteredResolved, tickerSearch, pipelineFilter, directionFilter])

  const filteredOpen = useMemo(() => {
    return monthFilteredOpen.filter(s => {
      const matchesSearch = s.ticker.toLowerCase().includes(tickerSearch.toLowerCase())
      const matchesPipeline = pipelineFilter === 'all' || s.pipeline === pipelineFilter
      const matchesDirection = directionFilter === 'all' || s.direction === directionFilter
      return matchesSearch && matchesPipeline && matchesDirection
    })
  }, [monthFilteredOpen, tickerSearch, pipelineFilter, directionFilter])

  // React Table Columns for Resolved Signals
  const resolvedColumnHelper = createColumnHelper<typeof features, ScoreboardSignal>()
  const resolvedColumns = useMemo(() => resolvedColumnHelper.columns([
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
      header: 'Pipeline / Style',
      cell: info => (
        <>
          <span className="font-mono text-xs text-gray-700 bg-brand-bg px-2 py-0.5 rounded border border-brand-border/60">
            {PIPELINE_DISPLAY_NAMES[info.getValue()] || info.getValue()}
          </span>
          {/* 2026-10-23 (0.8) */}
          {info.row.original.stage === 'shadow' && <ShadowBadge />}
        </>
      ),
    }),
    resolvedColumnHelper.accessor('direction', {
      header: 'Dir',
      cell: info => {
        const dir = info.getValue()
        const isLong = dir === 'long'
        return (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${isLong
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
      header: 'Status',
      cell: info => {
        const status = info.getValue()
        const isTarget = status === 'target'
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${isTarget
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
              }`}
          >
            {status}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('entry', {
      header: 'Entry',
      // 2026-10-26 (2.6): R1 rows entered at the next-open fill; show it, with the signal close in the tooltip
      cell: info => {
        const s = info.row.original
        if (s.fill_price !== null && s.fill_price !== undefined) {
          return (
            <span className="font-mono font-medium text-gray-700"
              title={`Filled at the open on ${s.fill_date ?? '?'}; signal close ${formatPrice(s.entry, 'USD')}`}>
              {formatPrice(s.fill_price, 'USD')}
            </span>
          )
        }
        return <span className="font-mono font-medium text-gray-700">{formatPrice(info.getValue(), 'USD')}</span>
      },
    }),
    resolvedColumnHelper.accessor('exit_price', {
      header: 'Exit',
      cell: info => {
        const val = info.getValue()
        return <span className="font-mono font-medium text-gray-700">{val != null ? formatPrice(val, 'USD') : '-'}</span>
      },
    }),
    resolvedColumnHelper.accessor('realized_r', {
      header: 'Realized R',
      cell: info => {
        const val = info.getValue()
        if (val == null) return <span className="text-gray-400 font-mono">-</span>
        const isPositive = val > 0
        return (
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{val.toFixed(2)}R
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('trade_return', {
      header: 'Trade Return',
      cell: info => {
        const val = info.getValue()
        if (val == null) return <span className="text-gray-400 font-mono">-</span>
        const isPositive = val > 0
        return (
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{formatPercent(val)}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('spy_return', {
      header: 'SPY Return',
      cell: info => {
        const val = info.getValue()
        if (val == null) return <span className="text-gray-400 font-mono">-</span>
        const isPositive = val > 0
        return (
          <span className={`font-mono ${isPositive ? 'text-gray-700' : 'text-gray-500'}`}>
            {isPositive ? '+' : ''}{formatPercent(val)}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('excess_return', {
      header: 'Alpha (vs benchmark)',   // 2026-10-23 (0.8): longs vs SPY, shorts vs cash
      cell: info => {
        const val = info.getValue()
        if (val == null) return <span className="text-gray-400 font-mono">-</span>
        const isPositive = val > 0
        return (
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isPositive ? '+' : ''}{formatPercent(val)}
          </span>
        )
      },
    }),
    resolvedColumnHelper.accessor('signal_date', {
      header: 'Signal Date',
      cell: info => <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>,
    }),
    resolvedColumnHelper.accessor('resolved_date', {
      header: 'Resolved Date',
      cell: info => <span className="font-mono text-xs text-gray-500">{info.getValue() ?? '-'}</span>,
    }),
    resolvedColumnHelper.accessor('bars_held', {
      header: 'Bars',
      cell: info => <span className="font-mono text-xs text-gray-600">{info.getValue() ?? '-'}</span>,
    }),
  ]), [resolvedColumnHelper])

  // React Table Columns for Open Signals
  const openColumnHelper = createColumnHelper<typeof features, ScoreboardSignal>()
  const openColumns = useMemo(() => openColumnHelper.columns([
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
      header: 'Pipeline / Style',
      cell: info => (
        <>
          <span className="font-mono text-xs text-gray-700 bg-brand-bg px-2 py-0.5 rounded border border-brand-border/60">
            {PIPELINE_DISPLAY_NAMES[info.getValue()] || info.getValue()}
          </span>
          {/* 2026-10-23 (0.8) */}
          {info.row.original.stage === 'shadow' && <ShadowBadge />}
        </>
      ),
    }),
    openColumnHelper.accessor('direction', {
      header: 'Dir',
      cell: info => {
        const dir = info.getValue()
        const isLong = dir === 'long'
        return (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${isLong
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
      cell: info => <span className="font-mono font-medium text-gray-700">{formatPrice(info.getValue(), 'USD')}</span>,
    }),
    openColumnHelper.accessor('signal_date', {
      header: 'Signal Date',
      cell: info => <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>,
    }),
    openColumnHelper.accessor('bars_held', {
      header: 'Bars Held',
      cell: info => <span className="font-mono text-xs text-gray-600">{info.getValue() ?? '-'}</span>,
    }),
  ]), [openColumnHelper])

  // Instantiate Tables
  const resolvedTable = useTable({
    features,
    data: filteredResolved,
    columns: resolvedColumns,
    state: { sorting },
    onSortingChange: setSorting,
    initialState: { pagination: { pageIndex: 0, pageSize: 15 } }
  })

  const openTable = useTable({
    features,
    data: filteredOpen,
    columns: openColumns,
    state: { sorting },
    onSortingChange: setSorting,
    initialState: { pagination: { pageIndex: 0, pageSize: 15 } }
  })

  const activeTable = activeTab === 'resolved' ? resolvedTable : openTable
  const activeFilteredDataCount = activeTab === 'resolved' ? filteredResolved.length : filteredOpen.length

  const handleResetFilters = () => {
    setTickerSearch('')
    setPipelineFilter('all')
    setDirectionFilter('all')
    setMonthFilter('all')
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
                Evaluate live, forward-test daily strategy signals and measure their actual closed PnL. Longs are benchmarked against SPY buy-and-hold over the same holding period; shorts against cash.
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
                <span className="font-bold text-brand-dark">One open signal per strategy and ticker</span>
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
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Longs only (shorts vs cash)</span>
                  </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Activity className="w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Alpha (vs benchmark)</span>
                  </div>
                  <div>
                    <span className={`font-mono text-2xl font-black ${overallStats.excess_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {overallStats.excess_return >= 0 ? '+' : ''}{formatPercent(overallStats.excess_return)}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Longs vs SPY, shorts vs cash</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scorecard Rollup Section */}
            <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="font-display text-lg font-bold text-brand-dark flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-primary" />
                  Pipeline Rollup Summary
                </h2>

                <div className="flex flex-wrap items-center gap-3">
                  {/* 2026-10-23 (0.5): ruleset filter (versions from the API), default all */}
                  <div
                    className="flex items-center gap-2 bg-brand-bg px-3 py-1.5 rounded-lg border border-brand-border text-xs font-mono"
                    title="Which rule set the signals were logged under (R0 = from the Phase 0 release)"
                  >
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Ruleset:</span>
                    <select
                      value={ruleset}
                      onChange={e => setRuleset(e.target.value)}
                      className="bg-transparent border-0 text-xs font-mono font-bold text-brand-dark focus:outline-hidden cursor-pointer p-0"
                    >
                      <option value="all">All</option>
                      {(data.meta?.ruleset_versions || []).map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2026-10-23 (0.8): Include shadow toggle on the totals */}
                  <label
                    className="flex items-center gap-1.5 bg-brand-bg px-3 py-1.5 rounded-lg border border-brand-border text-[10px] font-mono font-bold uppercase text-gray-500 cursor-pointer select-none"
                    title="Shadow strategies are logged and resolved as usual. Off: they are left out of the pipeline rows and totals."
                  >
                    <input
                      type="checkbox"
                      checked={includeShadow}
                      onChange={e => setIncludeShadow(e.target.checked)}
                      className="accent-brand-primary cursor-pointer"
                    />
                    Include shadow ({dynamicScorecardData.shadowCount})
                  </label>

                  {/* Timeframe / Month Selector */}
                  <div className="flex items-center gap-2 bg-brand-bg px-3 py-1.5 rounded-lg border border-brand-border text-xs font-mono">
                    <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Timeframe:</span>
                    <select
                      value={monthFilter}
                      onChange={e => setMonthFilter(e.target.value)}
                      className="bg-transparent border-0 text-xs font-mono font-bold text-brand-dark focus:outline-hidden cursor-pointer p-0"
                    >
                      <option value="all">All Time ({availableMonths.length} Months)</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2026-10-26 (2.6) */}
              {mixedBasis && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  R1 rows are net of the 0.10% round-trip cost and R2 rows of their liquidity-tier cost, both measured
                  from the next-open fill; rows logged before R1 are gross, from the signal close. Pick a ruleset above to compare like with like.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono table-auto min-w-[950px]">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-bg text-gray-500 uppercase text-[10px] whitespace-nowrap">
                      <th className="py-3 px-4 font-bold">Pipeline or Style / Strategy</th>
                      <th className="py-3 px-4 text-right font-bold">Resolved</th>
                      <th className="py-3 px-4 text-right font-bold">Open</th>
                      <th className="py-3 px-4 text-right font-bold">Win Rate{net}</th>
                      <th className="py-3 px-4 text-right font-bold">Mean R{net}</th>
                      <th className="py-3 px-4 text-right font-bold">Profit Factor{net}</th>
                      <th className="py-3 px-4 text-right font-bold">ROI{net}</th>
                      <th className="py-3 px-4 text-right font-bold">Backtest Exp-R{net}</th>
                      <th className="py-3 px-4 text-right font-bold">Avg Return{net}</th>
                      <th className="py-3 px-4 text-right font-bold">Avg SPY</th>
                      <th className="py-3 px-4 text-right font-bold">Alpha{net}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render each pipeline and its expandable strategies */}
                    {dynamicScorecardData.pipelines.map((pipeGroup) => {
                      const row = pipeGroup.bucket
                      const isExpanded = !!expandedPipelines[row.pipeline]
                      const hasStrategies = pipeGroup.strategies.length > 0

                      return (
                        <React.Fragment key={row.pipeline}>
                          {/* Parent Pipeline Row */}
                          <tr
                            className={`border-b border-brand-border/60 hover:bg-brand-bg/40 transition-colors whitespace-nowrap ${
                              isExpanded ? 'bg-brand-bg/50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-sans font-bold">
                              <div className="flex items-center gap-2">
                                {hasStrategies && (
                                  <button
                                    onClick={() => togglePipelineExpand(row.pipeline)}
                                    className="p-1 rounded hover:bg-brand-border/60 text-gray-600 transition-colors cursor-pointer"
                                    title={isExpanded ? 'Collapse strategy details' : 'Expand strategy details'}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-brand-primary" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-500" />
                                    )}
                                  </button>
                                )}
                                <span className="cursor-pointer" onClick={() => hasStrategies && togglePipelineExpand(row.pipeline)}>
                                  {PIPELINE_DISPLAY_NAMES[row.pipeline] || row.pipeline}
                                </span>
                                {hasStrategies && (
                                  <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-normal">
                                    {pipeGroup.strategies.length} {pipeGroup.strategies.length === 1 ? 'strategy' : 'strategies'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-bold">{row.resolved}</td>
                            <td className="py-3 px-4 text-right">{row.open}</td>
                            <td className="py-3 px-4 text-right">
                              {row.resolved > 0 ? formatPercent(row.win_rate) : '-'}
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${row.expectancy_r >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {row.resolved > 0 ? `${row.expectancy_r >= 0 ? '+' : ''}${row.expectancy_r.toFixed(2)} R` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {row.resolved > 0 ? formatPF(row.profit_factor) : '-'}
                            </td>
                            <NetCells r={row} className="py-3 px-4 text-right" />
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

                          {/* Sub-strategy rows when expanded */}
                          {isExpanded &&
                            pipeGroup.strategies.map((stratItem) => {
                              const sRow = stratItem.bucket
                              return (
                                <tr
                                  key={`${row.pipeline}-${stratItem.strategyName}`}
                                  className="border-b border-brand-border/40 bg-brand-bg/30 hover:bg-brand-bg/70 transition-colors whitespace-nowrap"
                                >
                                  <td className="py-2.5 px-4 font-sans pl-10 text-gray-700 text-xs">
                                    <div className="flex items-center gap-2">
                                      <CornerDownRight className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                                      <span className="font-mono text-xs font-semibold text-brand-dark">
                                        {stratItem.strategyName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">{sRow.resolved}</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">{sRow.open}</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-xs">
                                    {sRow.resolved > 0 ? formatPercent(sRow.win_rate) : '-'}
                                  </td>
                                  <td className={`py-2.5 px-4 text-right font-mono text-xs font-bold ${sRow.expectancy_r >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {sRow.resolved > 0 ? `${sRow.expectancy_r >= 0 ? '+' : ''}${sRow.expectancy_r.toFixed(2)} R` : '-'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">
                                    {sRow.resolved > 0 ? formatPF(sRow.profit_factor) : '-'}
                                  </td>
                                  <NetCells r={sRow} className="py-2.5 px-4 text-right font-mono text-xs text-gray-600" />
                                  <td className={`py-2.5 px-4 text-right font-mono text-xs font-bold ${sRow.avg_trade_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {sRow.resolved > 0 ? `${sRow.avg_trade_return >= 0 ? '+' : ''}${formatPercent(sRow.avg_trade_return)}` : '-'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">
                                    {sRow.resolved > 0 ? `${sRow.avg_spy_return >= 0 ? '+' : ''}${formatPercent(sRow.avg_spy_return)}` : '-'}
                                  </td>
                                  <td className={`py-2.5 px-4 text-right font-mono text-xs font-black ${sRow.excess_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {sRow.resolved > 0 ? `${sRow.excess_return >= 0 ? '+' : ''}${formatPercent(sRow.excess_return)}` : '-'}
                                  </td>
                                </tr>
                              )
                            })}
                        </React.Fragment>
                      )
                    })}

                    {/* Overall ALL Row */}
                    {dynamicScorecardData.allRow && (() => {
                      const allRow = dynamicScorecardData.allRow
                      return (
                        <tr className="bg-brand-bg/60 font-bold border-t-2 border-brand-dark/80 whitespace-nowrap">
                          <td className="py-3 px-4 font-sans font-bold">
                            All Pipelines
                            {/* 2026-10-23 (0.8) */}
                            <span className="ml-2 text-[10px] font-mono font-normal text-gray-500">
                              {includeShadow ? '(incl. shadow)' : '(excl. shadow)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">{allRow.resolved}</td>
                          <td className="py-3 px-4 text-right">{allRow.open}</td>
                          <td className="py-3 px-4 text-right">
                            {allRow.resolved > 0 ? formatPercent(allRow.win_rate) : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${allRow.expectancy_r >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {allRow.resolved > 0 ? `${allRow.expectancy_r >= 0 ? '+' : ''}${allRow.expectancy_r.toFixed(2)} R` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {allRow.resolved > 0 ? formatPF(allRow.profit_factor) : '-'}
                          </td>
                          <NetCells r={allRow} className="py-3 px-4 text-right" />
                          <td className={`py-3 px-4 text-right font-bold ${allRow.avg_trade_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {allRow.resolved > 0 ? `${allRow.avg_trade_return >= 0 ? '+' : ''}${formatPercent(allRow.avg_trade_return)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {allRow.resolved > 0 ? `${allRow.avg_spy_return >= 0 ? '+' : ''}${formatPercent(allRow.avg_spy_return)}` : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-black ${allRow.excess_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {allRow.resolved > 0 ? `${allRow.excess_return >= 0 ? '+' : ''}${formatPercent(allRow.excess_return)}` : '-'}
                          </td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 2026-10-23 (0.8): Shadow strategies, same columns. Always listed here,
                  whatever the Include shadow toggle says. */}
              <div className="mt-8">
                <h3 className="font-display text-base font-bold text-brand-dark flex items-center gap-2">
                  Shadow strategies
                  <ShadowBadge />
                </h3>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Signals from strategies in the shadow stage fire, are logged and resolve like any other, but are left
                  out of the pipeline rows and totals above unless &quot;Include shadow&quot; is on.
                </p>
                {dynamicScorecardData.shadowRows.length === 0 ? (
                  <p className="text-xs font-mono text-gray-400 py-3">No shadow-stage signals in this timeframe.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono table-auto min-w-[950px]">
                      <thead>
                        <tr className="border-b border-brand-border bg-brand-bg text-gray-500 uppercase text-[10px] whitespace-nowrap">
                          <th className="py-3 px-4 font-bold">Strategy / Direction</th>
                          <th className="py-3 px-4 text-right font-bold">Resolved</th>
                          <th className="py-3 px-4 text-right font-bold">Open</th>
                          <th className="py-3 px-4 text-right font-bold">Win Rate{net}</th>
                          <th className="py-3 px-4 text-right font-bold">Mean R{net}</th>
                          <th className="py-3 px-4 text-right font-bold">Profit Factor{net}</th>
                          <th className="py-3 px-4 text-right font-bold">ROI{net}</th>
                          <th className="py-3 px-4 text-right font-bold">Backtest Exp-R{net}</th>
                          <th className="py-3 px-4 text-right font-bold">Avg Return{net}</th>
                          <th className="py-3 px-4 text-right font-bold">Avg SPY</th>
                          <th className="py-3 px-4 text-right font-bold">Alpha{net}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dynamicScorecardData.shadowRows.map(sRow => (
                          <tr
                            key={`shadow-${sRow.pipeline}`}
                            className="border-b border-brand-border/40 hover:bg-brand-bg/40 transition-colors whitespace-nowrap"
                          >
                            <td className="py-2.5 px-4 font-mono text-xs font-semibold text-brand-dark">{sRow.pipeline}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">{sRow.resolved}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">{sRow.open}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs">
                              {sRow.resolved > 0 ? formatPercent(sRow.win_rate) : '-'}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-mono text-xs font-bold ${sRow.expectancy_r >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {sRow.resolved > 0 ? `${sRow.expectancy_r >= 0 ? '+' : ''}${sRow.expectancy_r.toFixed(2)} R` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">
                              {sRow.resolved > 0 ? formatPF(sRow.profit_factor) : '-'}
                            </td>
                            <NetCells r={sRow} className="py-2.5 px-4 text-right font-mono text-xs text-gray-600" />
                            <td className={`py-2.5 px-4 text-right font-mono text-xs font-bold ${sRow.avg_trade_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {sRow.resolved > 0 ? `${sRow.avg_trade_return >= 0 ? '+' : ''}${formatPercent(sRow.avg_trade_return)}` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-600">
                              {sRow.resolved > 0 ? `${sRow.avg_spy_return >= 0 ? '+' : ''}${formatPercent(sRow.avg_spy_return)}` : '-'}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-mono text-xs font-black ${sRow.excess_return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {sRow.resolved > 0 ? `${sRow.excess_return >= 0 ? '+' : ''}${formatPercent(sRow.excess_return)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                      {/* 2026-10-30 (3.2-4): R2 styles present in the log */}
                      {styleOptions.map(v => (
                        <option key={v} value={v}>{PIPELINE_DISPLAY_NAMES[v] || v}</option>
                      ))}
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
                        {activeTable.state.pagination.pageIndex * activeTable.state.pagination.pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-bold text-brand-dark">
                        {Math.min(
                          (activeTable.state.pagination.pageIndex + 1) * activeTable.state.pagination.pageSize,
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
