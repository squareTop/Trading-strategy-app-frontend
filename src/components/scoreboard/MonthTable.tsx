import { fmtR, fmtShare } from '#/lib/scoreboard'
import type { ScoreMonth } from '#/lib/types'

/**
 * 2026-11-12 (Scoreboard Rebuild): closed trades by month of exit date, so a
 * crash week reads as one bad month, not the verdict.
 */
export function MonthTable({ rows }: { rows: ScoreMonth[] }) {
  if (rows.length === 0) return <p className="text-xs text-gray-500 font-mono">No closed trades yet.</p>
  const month = (m: string) => {
    const dt = new Date(`${m}-01T00:00:00Z`)
    return Number.isNaN(dt.getTime()) ? m : dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  return (
    <table className="w-full text-xs font-mono">
      <thead>
        <tr className="text-gray-500 border-b border-brand-border">
          <th className="text-left font-semibold py-1">Month</th>
          <th className="text-right font-semibold py-1" title="Closed trades with an exit date in the month">Closed</th>
          <th className="text-right font-semibold py-1" title="Mean net R of those trades">Mean R</th>
          <th className="text-right font-semibold py-1" title="Trades with R > 0 / closed">Win rate</th>
          <th className="text-right font-semibold py-1" title="Sum of net R">Sum R</th>
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((r) => (
          <tr key={r.month} className="border-b border-brand-border/50 last:border-0">
            <td className="py-1 text-gray-700">{month(r.month)}</td>
            <td className="py-1 text-right">{r.closed}</td>
            <td className="py-1 text-right">{fmtR(r.mean_r)}</td>
            <td className="py-1 text-right">{fmtShare(r.win_rate)}</td>
            <td className="py-1 text-right">{fmtR(r.sum_r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default MonthTable
