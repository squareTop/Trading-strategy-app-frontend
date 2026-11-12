import { Link } from '@tanstack/react-router'
import { COLOUR_CLASS, COLOUR_TEXT } from '#/lib/scoreboard'
import type { ScoreSummaryLine } from '#/lib/types'

/**
 * 2026-11-12 (Scoreboard Rebuild): the signals-page badge. One line with the
 * strategy's live record, e.g. "smooth_trend@2 · forward · 412 closed · −0.12
 * R/trade · below backtest", from GET /api/scoreboard/v2/summary (the same
 * figures as its scoreboard card). Grey under 30 closed; green when the whole
 * 95% range is above 0; red when wholly below; grey otherwise. The colour's
 * meaning is also written out, for colour-blind readers. Links to the card.
 * No line (summary failed or missing) -> nothing: the row still shows.
 */
export function StrategyBadge({ line }: { line: ScoreSummaryLine | null | undefined }) {
  if (!line || !line.record) return null
  const colour = line.colour ?? 'neutral'
  const extra = COLOUR_TEXT[colour]
  const cls = `inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded border text-[10px] leading-tight font-mono whitespace-normal ${COLOUR_CLASS[colour]}`
  const body = (
    <>
      <span>{line.record}</span>
      {extra && <span className="font-bold">· {extra}</span>}
    </>
  )
  const title = 'Live record of this strategy version (scoreboard). Closed trades, mean net R per trade and how it compares with the backtest.'
  if (!line.anchor) {
    return <span className={cls} title={title} data-colour={colour}>{body}</span>
  }
  return (
    <Link to="/scoreboard" hash={line.anchor} className={`${cls} hover:underline`} title={`${title} Opens its card.`} data-colour={colour}>
      {body}
    </Link>
  )
}

export default StrategyBadge
