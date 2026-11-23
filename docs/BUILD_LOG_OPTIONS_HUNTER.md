# FoxelSignal Build Log — Options Hunter v0.4 and requested UI backlog

Date: 2026-11-23. Target branch: `staging`. Production `main` must not be modified without explicit approval.

## Build item OH-04 — Options Hunter contract usability (frontend-only)
Status: Patch prepared; requires staging installation and testing.

- Filter Alpaca-returned listed contracts by put/call and existing expiration selector.
- Add user-entered stock reference price so strike distance can be calculated without pretending Alpaca options snapshots contain a current stock quote.
- Add absolute percentage distance bands (0–5%, 5–10%, 10–15%, 15–25%, >25%) and above/below-moneyness filtering.
- Add sorting by strike, strike distance, indicative bid, or indicative bid/ask width.
- Add pagination, results counts, and partial-chain warnings.
- Show theoretical gross bid premium per one standard 100-share contract; retain explicit non-executable-quote warnings.
- Estimate intrinsic and extrinsic value from the manual reference price and indicative midpoint only when valid; do not invent IV, Delta, volume, or OI.
- No change to backtest matrix, probabilities, Alpaca backend, or trading execution.

Acceptance: AMD contracts load using deployed backend; changing underlying price/filter/sort/page updates table without another API request; empty/partial/failed chains handled gracefully; no credentials in browser; main remains unchanged.

## Requested UI follow-ups (logged, NOT implemented in OH-04)

### UI-01 — IV Valuation / Home: Signal status and View Signal
Status: Backlog.
- After user runs enterprise intrinsic-valuation analysis for a stock, show "View Signal" if a relevant signal exists for that ticker; otherwise show "No Signal".
- "View Signal" goes to the chart for that exact ticker AND signal, not generic Daily Signals.
- Recheck signal status on ticker changes and new analysis, with a loading/error state distinct from "No Signal".
- Clarify whether "active" or latest historical signals qualify before implementation; avoid implying an old signal is current.

### UI-02 — User Profile: Watchlist shortcut
Status: Backlog.
- Add a quick-access "Watchlist" navigation button in authenticated User Profile.
- It should route to `/watchlist`, respect current navigation styling, work on mobile, and have a clear accessible label.

### UI-03 — Watchlist signal deep link
Status: Backlog.
- Replace link to `/daily-signals` with direct signal-chart navigation for the selected watchlist row.
- Preserve ticker, strategy/version, signal date, direction, and stable signal ID where present.
- If the watchlist API exposes only `active_signal` and `active_strategy`, first resolve the precise signal ID or provide a safe informative fallback: never open an unrelated chart.
- Current uploaded frontend links signal badges to `/daily-signals` in `src/routes/(home)/watchlist.tsx`.

### UI-04 — Signal chart overlays: strategy-specific indicators
Status: Backlog, pending schema review.
- `SMOOTH_TREND@2`: show SMA200 in addition to existing strategy overlays.
- `UC1_DC1`: show SMA20, SMA50, Liquidity Points and prior swing highs/lows; label strategy setup points A, B, C.
- Liquidity/swing levels must come from the signal's actual point-in-time setup data (or a deterministic, validated reconstruction), not guessed from later bars.
- Only display overlays relevant to selected strategy/version; include legend/tooltips; avoid look-ahead and preserve readability on mobile.
- Validate real chart deep-link route and available chart API data before implementing UI-01/UI-03/UI-04.

## Deployment policy
One repository at a time: frontend staging patch -> checks -> commit and push staging -> deploy staging. Backend is untouched for OH-04. Review and approve before merging to `main`.
