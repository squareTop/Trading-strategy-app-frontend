import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useRef } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import {
  TrendingUp,
  TrendingDown,
  Send,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Terminal,
} from 'lucide-react'
import { formatPercent, formatPrice, formatLargeNumber, formatDate } from '../../lib/utils'
import { Link } from '@tanstack/react-router'

interface ThesisSignal {
  ticker: string
  direction: 'long' | 'short'
  state: number | null
  state_name: string | null
  selected_strategy: string | null
  markov_persistence: number | null
  markov_dwell_bars: number | null
  markov_next_state: number | null
  markov_next_state_prob: number | null
  entry: number | null
  stop: number | null
  target: number | null
  r_to_target: number | null
  risk_pct: number | null
  size: number | null
  risk_dollars: number | null
  markov_readout: string | null
}

interface CoverageRow {
  ticker: string
  state: number | null
  state_name: string | null
  persistence: number | null
  fired: boolean
  reject_reason: string | null
}

type Phase = 'idle' | 'streaming' | 'computing' | 'complete' | 'error'

const STORAGE_KEY = 'foxel_thesis_defaults'

function loadDefaults() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { }
  return { thesis: '', equity: 100000, riskPct: 2 }
}

function saveDefaults(thesis: string, equity: number, riskPct: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ thesis, equity, riskPct }))
  } catch { }
}

const DEFAULT_THESIS =
  'AI datacenter buildout accelerates into 2026 — compute, memory, networking, and power-delivery suppliers benefit most.'

export const Route = createFileRoute('/(home)/thesis')({
  component: ThesisPage,
})

const columnHelper = createColumnHelper<ThesisSignal>()

function extractTickers(text: string): string[] {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\[.*?\]/s)
  if (match) {
    try {
      const arr = JSON.parse(match[0])
      return arr.map((t: unknown) => String(t).trim().toUpperCase()).filter(Boolean)
    } catch { }
  }
  const words = cleaned.match(/[A-Z][A-Z0-9.\-]{0,9}/g)
  return [...new Set(words ?? [])]
}

function ThesisPage() {
  const saved = loadDefaults()
  const [thesis, setThesis] = useState(saved.thesis || DEFAULT_THESIS)
  const [equity, setEquity] = useState(saved.equity)
  const [riskPct, setRiskPct] = useState(saved.riskPct)
  const [phase, setPhase] = useState<Phase>('idle')
  const [records, setRecords] = useState<ThesisSignal[]>([])
  const [coverage, setCoverage] = useState<CoverageRow[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [showRawJson, setShowRawJson] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const { messages, sendMessage, isLoading, error, stop, clear } = useChat({
    connection: fetchServerSentEvents('/api/thesis'),
    onFinish: async (message) => {
      const fullText = message.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as any).content || '')
        .join('')
      const tickers = extractTickers(fullText)
      if (tickers.length === 0) {
        setPhase('error')
        setErrorMsg('Could not extract any tickers from the thesis response.')
        return
      }
      setPhase('computing')
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/api/thesis-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickers,
            equity,
            risk_pct: riskPct / 100,
          }),
        })
        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          throw new Error(`Backend returned ${res.status}: ${errBody}`)
        }
        const data = await res.json()
        console.log("api data", data)
        setRecords(data.records || [])
        setCoverage(data.coverage || [])
        setPhase('complete')
      } catch (err: any) {
        setPhase('error')
        setErrorMsg(err.message || 'Backend computation failed')
      }
    },
  })

  const handleSubmit = useCallback(() => {
    if (!thesis.trim() || isLoading) return
    saveDefaults(thesis, equity, riskPct)
    clear()
    setPhase('streaming')
    setRecords([])
    setCoverage([])
    setErrorMsg(null)
    abortRef.current = new AbortController()
    sendMessage(thesis.trim())
  }, [thesis, equity, riskPct, isLoading, sendMessage, clear])

  const handleCancel = useCallback(() => {
    stop()
    setPhase('idle')
  }, [stop])

  const handleReset = useCallback(() => {
    setPhase('idle')
    setRecords([])
    setCoverage([])
    setErrorMsg(null)
    clear()
  }, [clear])

  const lastAssistant = useMemo(
    () => messages.filter((m) => m.role === 'assistant').pop(),
    [messages],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('ticker', {
        header: 'Ticker',
        cell: (info) => (
          <Link
            to="/"
            search={{ ticker: info.getValue() }}
            className="font-mono font-black text-brand-primary hover:text-brand-primary-hover hover:underline flex items-center gap-1 cursor-pointer"
          >
            {info.getValue()}
            <ArrowUpRight className="w-3 h-3 text-brand-primary/60 shrink-0" />
          </Link>
        ),
      }),
      columnHelper.accessor('direction', {
        header: 'Direction',
        cell: (info) => {
          const dir = info.getValue()
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${dir === 'long'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
                }`}
            >
              {dir === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {dir}
            </span>
          )
        },
      }),
      columnHelper.accessor('state_name', {
        header: 'State',
        cell: (info) => (
          <span className="font-mono text-xs text-gray-700 bg-brand-bg px-2 py-0.5 rounded border border-brand-border/60">
            {info.getValue() || '-'}
          </span>
        ),
      }),
      columnHelper.accessor('selected_strategy', {
        header: 'Strategy',
        cell: (info) => <span className="font-mono text-xs text-gray-700">{info.getValue() || '-'}</span>,
      }),
      columnHelper.accessor('entry', {
        header: 'Entry',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono font-bold text-brand-dark">{v ? formatPrice(v, 'USD') : '-'}</span>
        },
      }),
      columnHelper.accessor('stop', {
        header: 'Stop',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono text-red-600">{v ? formatPrice(v, 'USD') : '-'}</span>
        },
      }),
      columnHelper.accessor('target', {
        header: 'Target',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono text-emerald-600">{v ? formatPrice(v, 'USD') : '-'}</span>
        },
      }),
      columnHelper.accessor('r_to_target', {
        header: 'R:R',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono font-bold text-brand-dark">{v ? `${v.toFixed(2)}R` : '-'}</span>
        },
      }),
      columnHelper.accessor('size', {
        header: 'Size',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono text-gray-700">{v !== null ? formatLargeNumber(v) : '-'}</span>
        },
      }),
      columnHelper.accessor('risk_dollars', {
        header: 'Risk $',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono text-gray-700 font-medium">{v !== null ? formatPrice(v, 'USD') : '-'}</span>
        },
      }),
      columnHelper.accessor('markov_persistence', {
        header: 'Persist',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono">{v !== null ? (v * 100).toFixed(0) + '%' : '-'}</span>
        },
      }),
      columnHelper.accessor('markov_dwell_bars', {
        header: 'Dwell',
        cell: (info) => {
          const v = info.getValue()
          return <span className="font-mono text-gray-600">{v !== null ? `${v.toFixed(0)}b` : '-'}</span>
        },
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary/20 selection:text-brand-dark pb-20">
      <main className="max-w-360 mx-auto px-4 md:px-8 mt-8">
        <div className="bg-white border border-brand-border rounded-xl p-6 md:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-xs text-brand-primary font-bold uppercase tracking-wider block mb-0.5">
                AI-Powered Thesis Engine
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight leading-none">
                Thesis Scanner
              </h1>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6 max-w-2xl">
            Describe an investment thesis in plain English. DeepSeek extracts relevant tickers,
            then the FoxelSignal engine classifies each into 8 Markov states, computes
            transition probabilities, and generates entry/stop/target signals.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!isLoading) handleSubmit()
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                Investment Thesis
              </label>
              <textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Describe your investment thesis..."
                rows={4}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-brand-border bg-brand-bg/30 text-brand-dark font-sans text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all resize-vertical disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                  Portfolio Equity ($)
                </label>
                <input
                  type="number"
                  value={equity}
                  onChange={(e) => setEquity(Number(e.target.value))}
                  disabled={isLoading}
                  min={1000}
                  className="w-full px-4 py-3 rounded-lg border border-brand-border bg-brand-bg/30 text-brand-dark font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                  Risk Per Trade (%)
                </label>
                <input
                  type="number"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  disabled={isLoading}
                  min={0.01}
                  max={10}
                  step={0.01}
                  className="w-full px-4 py-3 rounded-lg border border-brand-border bg-brand-bg/30 text-brand-dark font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 rounded-xl bg-red-500 text-white text-xs font-extrabold uppercase tracking-wide hover:bg-red-600 active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancel
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!thesis.trim()}
                  className="px-6 py-3 rounded-xl bg-brand-primary text-white text-xs font-extrabold uppercase tracking-wide hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                >
                  <Send className="w-4 h-4" />
                  Run Thesis Scan
                </button>
              )}
            </div>
          </form>
        </div>

        {(isLoading || phase === 'computing') && (
          <div className="mt-6 bg-white border border-brand-border rounded-xl p-6 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
              <div>
                <p className="font-display font-bold text-brand-dark text-sm">
                  {phase === 'computing'
                    ? 'Running classification & Markov analysis...'
                    : 'Extracting tickers from thesis...'}
                </p>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  {phase === 'computing' ? 'Backend Computation' : 'DeepSeek V4 Flash'}
                </p>
              </div>
            </div>

            {isLoading && lastAssistant && (
              <div className="bg-[#111827] text-[#93c5fd] font-mono text-xs p-4 rounded-lg overflow-x-auto max-h-40 leading-relaxed border border-brand-primary/10">
                <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-bold flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  LLM Output Stream
                </div>
                {lastAssistant.parts
                  .filter((p) => p.type === 'text')
                  .map((p, i) => <span key={i}>{(p as { content: string }).content || ''}</span>)}
              </div>
            )}

            <div className="mt-3 h-1 bg-brand-bg rounded-full overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full animate-pulse transition-all" style={{ width: phase === 'computing' ? '80%' : '40%' }} />
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 shadow-xs animate-fade-in">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-bold text-red-950 text-sm">Connection Error</h4>
                <p className="text-xs text-red-800 mt-1 font-mono">{error.message}</p>
                <button onClick={handleSubmit} className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'error' && !isLoading && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 shadow-xs animate-fade-in">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-bold text-red-950 text-sm">Thesis Scan Failed</h4>
                <p className="text-xs text-red-800 mt-1 font-mono">{errorMsg}</p>
                <button onClick={handleReset} className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'complete' && records.length > 0 && (
          <div className="mt-6 space-y-6 animate-fade-in">
            {coverage.length > 0 && (
              <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-display font-bold text-brand-dark text-sm uppercase tracking-wider">
                    Regime Map — {coverage.length} Ticker(s) Analyzed
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {coverage.map((c) => (
                    <div
                      key={c.ticker}
                      className={`p-3 rounded-lg border text-xs font-mono ${c.fired
                        ? 'bg-emerald-50 border-emerald-200'
                        : c.reject_reason
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-brand-dark">{c.ticker}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${c.fired ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                            }`}
                        >
                          {c.fired ? 'SIGNAL' : c.reject_reason || 'SKIP'}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        State: {c.state_name || 'N/A'}
                        {c.persistence !== null && <> | Persist: {(c.persistence * 100).toFixed(0)}%</>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-brand-border bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-display font-bold text-brand-dark text-sm uppercase tracking-wider">
                    Thesis Signals — {records.length} Firing
                  </h3>
                </div>
                <button
                  onClick={handleReset}
                  className="bg-brand-bg hover:bg-brand-border/40 text-brand-dark p-2 rounded-lg border border-brand-border/80 transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New Scan
                </button>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto min-w-[900px]">
                  <thead className="bg-[#f0eadd]/60 border-b border-brand-border">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 bg-white text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 select-none border-b border-brand-border whitespace-nowrap"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                onClick={header.column.getToggleSortingHandler()}
                                className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-brand-primary transition-all' : ''}`}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && (
                                  <span className="shrink-0">
                                    {({
                                      asc: ' ▴',
                                      desc: ' ▾',
                                    })[header.column.getIsSorted() as string] ?? (
                                        <ArrowUpDown className="w-3 h-3 opacity-30 inline" />
                                      )}
                                  </span>
                                )}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-brand-border/50">
                    {table.getRowModel().rows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-brand-primary/5 transition-all ${index % 2 === 1 ? 'bg-brand-bg/30' : 'bg-white'}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3.5 text-xs text-brand-dark whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {table.getPageCount() > 1 && (
                <div className="px-4 py-4 md:px-6 border-t border-brand-border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-mono text-gray-500">
                  <span>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="p-2 rounded-lg border border-brand-border/60 hover:bg-brand-bg transition-all disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="p-2 rounded-lg border border-brand-border/60 hover:bg-brand-bg transition-all disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#f0eadd] border border-brand-border rounded-xl p-5 shadow-xs">
              <p className="font-mono text-[10px] text-gray-500">
                Signals generated via DeepSeek V4 Flash + FoxelSignal thesis engine.
                Markov state classification uses 8-state HMM regime detection.
              </p>
            </div>
          </div>
        )}

        {phase === 'complete' && records.length === 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-xs animate-fade-in">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-bold text-amber-900 text-sm">No Signals Fired</h4>
                <p className="text-xs text-amber-800 mt-1">
                  All tickers were analyzed but none met the entry criteria. Check the regime map for details.
                </p>
                <button onClick={handleReset} className="mt-3 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
                  Try Another Thesis
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}