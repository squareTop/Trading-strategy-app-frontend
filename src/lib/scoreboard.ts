import { queryOptions } from '@tanstack/react-query'
import { API_URL } from './config'
import type {
  ScoreboardSummaryResponse,
  ScoreboardV2Response,
  ScoreColour,
  ScoreSummaryLine,
  ScoreVerdict,
} from './types'

/**
 * 2026-11-12 (Scoreboard Rebuild): queries and display helpers for the
 * scoreboard and the signals-page badge. Every figure comes from the server
 * (app/strategies/scoreboard.py); these helpers only format what it sends.
 * R is always shown to two decimals with a sign; there is no ROI and no
 * percentage of capital anywhere.
 */

const TEN_MINUTES = 10 * 60 * 1000 // the figures change once a day

export const scoreboardV2QueryOptions = queryOptions({
  queryKey: ['scoreboard-v2'],
  queryFn: async () => {
    const res = await fetch(`${API_URL}/api/scoreboard/v2`)
    if (!res.ok) throw new Error(`Scoreboard request failed (status ${res.status})`)
    return res.json() as Promise<ScoreboardV2Response>
  },
  staleTime: TEN_MINUTES,
})

export const scoreboardSummaryQueryOptions = queryOptions({
  queryKey: ['scoreboard-summary'],
  queryFn: async () => {
    const res = await fetch(`${API_URL}/api/scoreboard/v2/summary`)
    if (!res.ok) throw new Error(`Scoreboard summary request failed (status ${res.status})`)
    return res.json() as Promise<ScoreboardSummaryResponse>
  },
  staleTime: TEN_MINUTES,
})

const DASH = '—'
const ok = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

/** "+0.21 R" / "−0.62 R" */
export function fmtR(v: number | null | undefined): string {
  if (!ok(v)) return DASH
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±'
  return `${sign}${Math.abs(v).toFixed(2)} R`
}

/** "−0.30 to +0.70 R" */
export function fmtRange(lo: number | null | undefined, hi: number | null | undefined): string {
  if (!ok(lo) || !ok(hi)) return DASH
  return `${fmtR(lo).replace(' R', '')} to ${fmtR(hi)}`
}

/** A share of trades, e.g. win rate: "55%" */
export function fmtShare(v: number | null | undefined): string {
  if (!ok(v)) return DASH
  return `${Math.round(v * 100)}%`
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (!ok(v)) return DASH
  return Number.isInteger(v) ? String(v) : v.toFixed(digits)
}

/** "3 Nov" (or "3 Nov 2025" outside the current year of `asof`) */
export function fmtDay(d: string | null | undefined, refYear?: string | null): string {
  if (!d) return DASH
  const dt = new Date(`${d.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) return d
  const sameYear = refYear ? d.slice(0, 4) === refYear.slice(0, 4) : false
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' })
}

/** "12 Nov 2026 08:31 SGT" */
export function fmtComputedAt(iso: string | null | undefined): string {
  if (!iso) return DASH
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z` // stored in UTC
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return iso
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(dt)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')} SGT`
}

export const VERDICT_LABEL: Record<ScoreVerdict, string> = {
  too_few: 'too few',
  inside: 'inside',
  below: 'below',
  above: 'above',
  no_backtest: 'no backtest',
}

/** Colour of a mean or a badge line: grey, green or red (text says the same). */
export const COLOUR_CLASS: Record<ScoreColour, string> = {
  neutral: 'text-gray-700 bg-gray-50 border-gray-300',
  green: 'text-emerald-800 bg-emerald-50 border-emerald-300',
  red: 'text-red-800 bg-red-50 border-red-300',
}

/** The same meaning as the colour, in words (for colour-blind readers). */
export const COLOUR_TEXT: Record<ScoreColour, string> = {
  neutral: '',
  green: 'range above 0',
  red: 'range below 0',
}

export const STAGE_CLASS: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  paper: 'bg-sky-50 text-sky-800 border-sky-300',
  forward: 'bg-amber-50 text-amber-800 border-amber-300',
  shadow: 'bg-gray-100 text-gray-600 border-gray-400 border-dashed',
  retired: 'bg-gray-100 text-gray-500 border-gray-300',
  archived: 'bg-gray-100 text-gray-500 border-gray-300',
}

/** The card key a signals row belongs to (same rule as scoreboard.card_key). */
export function cardKey(row: { strategy_version?: string | null; selected_strategy?: string | null; ruleset_version?: string | null }): string {
  const sv = row.strategy_version
  if (sv && sv.includes('@')) return sv
  return `${row.selected_strategy || 'unknown'} · ${row.ruleset_version || 'pre-R0'}`
}

/** A card's element id on the page (same rule as scoreboard.anchor). */
export function anchorOf(key: string, direction: string): string {
  return `${key} ${direction}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Badge line for each signals row: one lookup map built once per page. */
export function summaryLookup(summary: ScoreboardSummaryResponse | undefined | null) {
  const map = new Map<string, ScoreSummaryLine>()
  for (const l of summary?.lines ?? []) map.set(`${l.key}|${l.direction}`, l)
  return (row: { direction?: string | null; strategy_version?: string | null; selected_strategy?: string | null; ruleset_version?: string | null }) =>
    map.get(`${cardKey(row)}|${row.direction ?? ''}`) ?? null
}
