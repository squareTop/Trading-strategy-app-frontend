import { useEffect, useState } from 'react'
import { fmtDay, fmtR, fmtRange } from '#/lib/scoreboard'
import type { ScoreRetiredGroup } from '#/lib/types'
import { ScoreCard } from './ScoreCard'

/**
 * 2026-11-12 (Scoreboard Rebuild): strategies that no longer run, grouped by
 * strategy so one strategy's versions sit together (pre-R0, R0, @1 ...).
 * Collapsed by default; each row expands to its frozen card. `openAnchor`
 * (from the page's #hash, e.g. a signals-page badge) opens the section and
 * that card.
 */
export function RetiredList({ groups, tooltips, openAnchor }: { groups: ScoreRetiredGroup[]; tooltips: Record<string, string>; openAnchor?: string | null }) {
  const holds = (a?: string | null) => !!a && groups.some((g) => g.cards.some((c) => c.anchor === a))
  const [open, setOpen] = useState<boolean>(holds(openAnchor))
  const [expanded, setExpanded] = useState<string | null>(holds(openAnchor) ? openAnchor ?? null : null)

  useEffect(() => {
    if (holds(openAnchor)) {
      setOpen(true)
      setExpanded(openAnchor ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAnchor, groups])

  if (groups.length === 0) return null
  const names = groups.map((g) => g.strategy).join(', ')

  return (
    <section className="bg-white border border-brand-border rounded-xl p-5 shadow-xs">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="w-full flex flex-wrap items-baseline justify-between gap-2 text-left">
        <span className="font-display text-base font-bold text-brand-dark">{open ? '▾' : '▸'} Retired strategies (frozen)</span>
        <span className="text-xs font-mono text-gray-500 truncate max-w-full">{names}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-gray-500">
            These versions no longer fire. Their figures stop changing once their last open trade closes; signals
            logged before versions existed are listed by ruleset (pre-R0, R0).
          </p>
          {groups.map((g) => (
            <div key={g.strategy}>
              <h3 className="font-mono text-sm font-bold text-brand-dark">
                {g.strategy}
                {g.display_name && g.display_name !== g.strategy && <span className="font-sans font-normal text-gray-500"> · {g.display_name}</span>}
                {g.style_display && <span className="font-sans font-normal text-gray-400"> · {g.style_display}</span>}
              </h3>
              <ul className="mt-1 divide-y divide-brand-border/60 border-t border-brand-border/60">
                {g.cards.map((c) => (
                  <li key={c.anchor} id={expanded === c.anchor ? undefined : c.anchor} className="scroll-mt-24">
                    <button type="button" onClick={() => setExpanded((cur) => (cur === c.anchor ? null : c.anchor))}
                      aria-expanded={expanded === c.anchor}
                      className="w-full flex flex-wrap items-center justify-between gap-2 py-2 text-left text-xs font-mono hover:bg-brand-bg/60">
                      <span>
                        <span className="font-bold text-brand-dark">{c.label}</span> · {c.direction === 'all' ? 'both' : c.direction}
                      </span>
                      <span className="text-gray-600">
                        {c.closed} closed · {fmtR(c.mean_r)} ({fmtRange(c.mean_r_lo, c.mean_r_hi)})
                        {c.open > 0 && <> · {c.open} still open</>}
                        {' · '}{c.retired_on ? `retired on ${fmtDay(c.retired_on)}` : `last signal ${fmtDay(c.last_signal)}`}
                      </span>
                    </button>
                    {expanded === c.anchor && (
                      <div className="pb-3"><ScoreCard card={c} tooltips={tooltips} /></div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default RetiredList
