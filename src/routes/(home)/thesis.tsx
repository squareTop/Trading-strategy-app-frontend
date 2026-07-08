import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useRef } from 'react'
import { useChat } from '@tanstack/ai-react'
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
  MessageSquareText,
} from 'lucide-react'
import { formatPrice, formatLargeNumber } from '../../lib/utils'
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

type Step = 'idle' | 'extracting' | 'analyzing' | 'explaining' | 'complete' | 'error'

const STORAGE_KEY = 'foxel_thesis_defaults'

function loadDefaults() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { thesis: '', equity: 100000, riskPct: 2 }
}

function saveDefaults(thesis: string, equity: number, riskPct: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ thesis, equity, riskPct }))
  } catch {}
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
    } catch {}
  }
  const words = cleaned.match(/[A-Z][A-Z0-9.\-]{0,9}/g)
  return [...new Set(words ?? [])]
}

function ThesisPage() {
  const saved = loadDefaults()
  const [thesis, setThesis] = useState(saved.thesis || DEFAULT_THESIS)
  const [equity, setEquity] = useState(saved.equity)
  const [riskPct, setRiskPct] = useState(saved.riskPct)
  const [step, setStep] = useState<Step>('idle')
  const [records, setRecords] = useState<ThesisSignal[]>([])
  const [coverage, setCoverage] = useState<CoverageRow[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pipelineTime, setPipelineTime] = useState(0)
  const [explainText, setExplainText] = useState('')
  const [isExplaining, setIsExplaining] = useState(false)
  const explainAbortRef = useRef<AbortController | null>(null)

  const {
    messages: extractMessages,
    sendMessage: sendExtract,
    isLoading: isExtracting,
    stop: stopExtract,
  } = useChat({
    fetcher: ({ messages }) =>
      fetch('/api/thesis', {
        method: 'POST',
        body: JSON.stringify({ messages, max_tickers: 20 }),
      }),
    onFinish: async (message) => {
      const fullText = message.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as { content: string }).content)
        .join('')
      const tickers = extractTickers(fullText)
      if (tickers.length === 0) {
        setStep('error')
        setErrorMsg('Could not extract any tickers from the thesis response.')
        return
      }
      setStep('analyzing')
      const t0 = performance.now()
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/api/thesis-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, equity, risk_pct: riskPct / 100 }),
        })
        setPipelineTime(performance.now() - t0)
        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          throw new Error(`Backend returned ${res.status}: ${errBody}`)
        }
        const data = await res.json()
        setRecords(data.records || [])
        setCoverage(data.coverage || [])

        if (data.records && data.records.length > 0) {
          setStep('complete')
        } else {
          setStep('explaining')
          sendExplain(thesis, data.coverage || [])
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Backend computation failed'
        setStep('error')
        setErrorMsg(msg)
      }
    },
  })

  const sendExplain = useCallback(
    async (thesisText: string, cov: CoverageRow[]) => {
      setIsExplaining(true)
      setExplainText('')
      const controller = new AbortController()
      explainAbortRef.current = controller

      try {
        const res = await fetch('/api/thesis-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thesis: thesisText, coverage: cov }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Explain endpoint returned ${res.status}`)

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''
        let acc = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              try {
                const chunk = JSON.parse(line.slice(6))
                if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
                  acc += chunk.delta || ''
                  setExplainText(acc)
                }
              } catch {
                const raw = line.slice(6)
                if (raw !== '[DONE]') acc += raw
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setExplainText('[Analyst note generation failed]')
      } finally {
        setIsExplaining(false)
        setStep('complete')
      }
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    if (!thesis.trim() || isExtracting || isExplaining) return
    saveDefaults(thesis, equity, riskPct)
    setStep('extracting')
    setRecords([])
    setCoverage([])
    setErrorMsg(null)
    setPipelineTime(0)
    sendExtract(thesis.trim())
  }, [thesis, equity, riskPct, isExtracting, isExplaining, sendExtract])

  const handleCancel = useCallback(() => {
    stopExtract()
    explainAbortRef.current?.abort()
    setStep('idle')
  }, [stopExtract])

  const handleReset = useCallback(() => {
    setStep('idle')
    setRecords([])
    setCoverage([])
    setErrorMsg(null)
  }, [])

  const lastAssistant = useMemo(
    () => extractMessages.filter((m) => m.role === 'assistant').pop(),
    [extractMessages],
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
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                dir === 'long'
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
        cell: (info) => (
          <span className="font-mono text-xs text-gray-700">{info.getValue() || '-'}</span>
        ),
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

  const isRunning = isExtracting || step === 'analyzing' || isExplaining

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
            Describe an investment thesis in plain English. The AI extracts relevant tickers (max 20),
            then the FoxelSignal engine classifies each into 8 Markov states, computes
            transition probabilities, and generates entry/stop/target signals.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
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
                disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
                  min={0.01}
                  max={10}
                  step={0.01}
                  className="w-full px-4 py-3 rounded-lg border border-brand-border bg-brand-bg/30 text-brand-dark font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {isRunning ? (
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

        {isRunning && (
          <div className="mt-6 bg-white border border-brand-border rounded-xl p-6 shadow-xs animate-fade-in">
            <div className="space-y-3">
              {/* Step 1: LLM extraction */}
              <div className="flex items-start gap-3">
                {step === 'extracting' ? (
                  <Loader2 className="w-4 h-4 text-brand-primary animate-spin mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-bold text-brand-dark">
                    Extracting tickers from thesis
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">AI Ticker Extraction</p>
                </div>
              </div>

              {/* Step 2: Analysis */}
              <div className="flex items-start gap-3">
                {step === 'extracting' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 mt-0.5 shrink-0" />
                ) : step === 'analyzing' ? (
                  <Loader2 className="w-4 h-4 text-brand-primary animate-spin mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-bold text-brand-dark">
                    Running classification & analysis
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {step === 'extracting' ? 'Waiting...' : step === 'analyzing' ? `${pipelineTime > 0 ? (pipelineTime / 1000).toFixed(1) + 's' : 'Processing...'}` : 'Done'}
                  </p>
                </div>
              </div>

              {/* Step 3: Analyst explain (only when no signals) */}
              {step === 'explaining' && (
                <div className="flex items-start gap-3">
                  <Loader2 className="w-4 h-4 text-brand-primary animate-spin mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-bold text-brand-dark">
                      Generating analyst commentary
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">AI Analysis</p>
                  </div>
                </div>
              )}
            </div>

            {isExtracting && lastAssistant && (
              <div className="mt-4 bg-[#111827] text-[#93c5fd] font-mono text-xs p-4 rounded-lg overflow-x-auto max-h-32 leading-relaxed border border-brand-primary/10">
                <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-bold flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  LLM Stream
                </div>
                {lastAssistant.parts
                  .filter((p) => p.type === 'text')
                  .map((p, i) => (
                    <span key={i}>{(p as { content: string }).content || ''}</span>
                  ))}
              </div>
            )}

            {(step === 'explaining' || (step === 'analyzing' && !isExtracting)) && (
              <div className="mt-3 h-1 bg-brand-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-primary rounded-full animate-pulse transition-all"
                  style={{ width: step === 'explaining' ? '80%' : '50%' }}
                />
              </div>
            )}
          </div>
        )}

        {step === 'explaining' && explainText && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <MessageSquareText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-bold text-amber-900 text-sm mb-2">Analyst Note</h4>
                <div className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap font-sans">
                  {explainText}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'error' && !isRunning && (
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

        {step === 'complete' && (
          <div className="mt-6 space-y-6 animate-fade-in">
            {coverage.length > 0 && (
              <div className="bg-white border border-brand-border rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-display font-bold text-brand-dark text-sm uppercase tracking-wider">
                    Regime Map — {coverage.length} Ticker(s) Analyzed
                  </h3>
                  {pipelineTime > 0 && (
                    <span className="text-[10px] font-mono text-gray-400 ml-auto">
                      {(pipelineTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {coverage.map((c) => (
                    <div
                      key={c.ticker}
                      className={`p-3 rounded-lg border text-xs font-mono ${
                        c.fired
                          ? 'bg-emerald-50 border-emerald-200'
                          : c.reject_reason
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          to="/"
                          search={{ ticker: c.ticker }}
                          className="font-black text-brand-primary hover:text-brand-primary-hover hover:underline flex items-center gap-1 transition-all"
                        >
                          {c.ticker}
                          <ArrowUpRight className="w-3 h-3 text-brand-primary/60 shrink-0" />
                        </Link>
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            c.fired ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
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

            {records.length > 0 && (
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
                        className="p-2 rounded-lg border border-brand-border/60 hover:bg-brand-bg transition-all disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="p-2 rounded-lg border border-brand-border/60 hover:bg-brand-bg transition-all disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#f0eadd] border border-brand-border rounded-xl p-5 shadow-xs">
              <p className="font-mono text-[10px] text-gray-500">
                Signals generated via AI-driven ticker extraction + FoxelSignal thesis engine.
                Markov state classification uses 8-state HMM regime detection.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}