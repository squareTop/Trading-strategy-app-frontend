import { createFileRoute } from '@tanstack/react-router'
import "./styles.css"

export const Route = createFileRoute('/(home)/vmi/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='vmi-page'>
      <section className="topbar">
        <div>
          <div className="eyebrow">
            <span className="pulse" /> VMI valuation model
          </div>
          <h1>Valuation first. Signal second.</h1>
          <p>
            Review whether a stock is trading below or above your estimated
            intrinsic value before checking technical strategy signals.
          </p>
        </div>
        <div className="search-card">
          <div className="search-label">Search ticker</div>
          <div className="search-row">
            <input type="text" defaultValue="AAPL" aria-label="Ticker symbol" />
            <button className="btn">Analyze</button>
          </div>
        </div>
      </section>
      <section style={{
        padding: "unset"
      }}>
        <div className="dashboard-grid">
          <div className="card card-pad">
            <div className="company-head">
              <div className="company-title">
                <h2>Apple Inc.</h2>
                <p>NASDAQ: AAPL · Consumer Electronics · Updated 26 Apr 2026</p>
              </div>
              <div className="status-badge status-good">Undervalued</div>
            </div>
            <div className="summary-layout">
              <div className="hero-number">
                <div>
                  <span>Estimated intrinsic value</span>
                  <strong>$184.20</strong>
                  <p>
                    Based on VMI cash flow, growth, debt, cash and discount-rate
                    assumptions.
                  </p>
                </div>
                <div className="price-strip">
                  <div className="price-pill">
                    <small>Market Price</small>
                    <b>$162.80</b>
                  </div>
                  <div className="price-pill">
                    <small>Upside</small>
                    <b className="positive">+13.1%</b>
                  </div>
                  <div className="price-pill">
                    <small>Signal</small>
                    <b>Watch</b>
                  </div>
                </div>
              </div>
              <div className="valuation-gauge">
                <div>
                  <h3>Valuation zone</h3>
                  <p>
                    The marker shows where current price sits compared with
                    estimated intrinsic value.
                  </p>
                </div>
                <div>
                  <div className="gauge">
                    <div className="gauge-marker" />
                  </div>
                  <div className="gauge-labels">
                    <span>Cheap</span>
                    <span>Fair</span>
                    <span>Expensive</span>
                  </div>
                </div>
                <div className="decision-box">
                  <strong>Decision: Add to watchlist</strong>
                  <p>
                    Valuation is attractive, but technical confirmation is still
                    required before entry.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title">
              <h3>VMI verdict</h3>
              <span>Decision support</span>
            </div>
            <div className="note-stack">
              <div className="note">
                <div className="note-icon">✅</div>
                <div>
                  <strong>Price is below intrinsic value</strong>
                  <p>
                    The model estimates a moderate discount versus fair value,
                    creating room for further review.
                  </p>
                </div>
              </div>
              <div className="note">
                <div className="note-icon">⚠️</div>
                <div>
                  <strong>Margin of safety is not huge</strong>
                  <p>
                    This is not a deep-value setup. A stronger discount would give
                    better downside protection.
                  </p>
                </div>
              </div>
              <div className="note">
                <div className="note-icon">📈</div>
                <div>
                  <strong>Next step: check strategy signal</strong>
                  <p>
                    Use the backtest page to confirm whether the selected strategy
                    currently supports an entry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card">
            <span>Operating Cash Flow</span>
            <strong>$118.2B</strong>
            <p>Primary cash flow input for valuation.</p>
          </div>
          <div className="metric-card">
            <span>Free Cash Flow</span>
            <strong>$105.4B</strong>
            <p>Used as secondary valuation reference.</p>
          </div>
          <div className="metric-card">
            <span>Discount Rate</span>
            <strong>9.2%</strong>
            <p>Risk-adjusted rate applied to future value.</p>
          </div>
          <div className="metric-card">
            <span>Confidence</span>
            <strong className="neutral">Medium</strong>
            <p>Valuation depends heavily on growth assumptions.</p>
          </div>
        </div>
        <div className="section-grid">
          <div className="card card-pad">
            <div className="card-title">
              <h3>Model assumptions</h3>
              <span>Base case</span>
            </div>
            <div className="table">
              <div className="row head">
                <span>Input</span>
                <span>Value</span>
                <span>Comment</span>
              </div>
              <div className="row">
                <span>Growth rate years 1–5</span>
                <span>8.5%</span>
                <span>Near-term growth estimate</span>
              </div>
              <div className="row">
                <span>Growth rate years 6–10</span>
                <span>6.0%</span>
                <span>Gradual slowdown</span>
              </div>
              <div className="row">
                <span>Growth rate years 11–20</span>
                <span>3.0%</span>
                <span>Mature business assumption</span>
              </div>
              <div className="row">
                <span>Total debt per share</span>
                <span>$6.16</span>
                <span>Deducted from valuation</span>
              </div>
              <div className="row">
                <span>Cash per share</span>
                <span>$4.56</span>
                <span>Added back to valuation</span>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title">
              <h3>Scenario range</h3>
              <span>Sensitivity view</span>
            </div>
            <div className="scenario-grid">
              <div className="scenario-card bear">
                <span>Bear case</span>
                <h4>$142</h4>
                <p>
                  Lower growth and higher discount rate. Current price may be
                  expensive.
                </p>
              </div>
              <div className="scenario-card base">
                <span>Base case</span>
                <h4>$184</h4>
                <p>Balanced estimate using current VMI model assumptions.</p>
              </div>
              <div className="scenario-card bull">
                <span>Bull case</span>
                <h4>$226</h4>
                <p>Higher growth and stronger cash flow durability.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="section-grid">
          <div className="card card-pad">
            <div className="card-title">
              <h3>Valuation breakdown</h3>
              <span>Per share</span>
            </div>
            <div className="table">
              <div className="row head">
                <span>Component</span>
                <span>Value</span>
                <span>Impact</span>
              </div>
              <div className="row">
                <span>PV of future cash flow</span>
                <span>$185.80</span>
                <span className="positive">Core value</span>
              </div>
              <div className="row">
                <span>Less debt per share</span>
                <span>-$6.16</span>
                <span className="negative">Reduces value</span>
              </div>
              <div className="row">
                <span>Add cash per share</span>
                <span>+$4.56</span>
                <span className="positive">Adds value</span>
              </div>
              <div className="row">
                <span>Final intrinsic value</span>
                <span>$184.20</span>
                <span>Base estimate</span>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title">
              <h3>What this means</h3>
              <span>Plain English</span>
            </div>
            <div className="note-stack">
              <div className="note">
                <div className="note-icon">🦊</div>
                <div>
                  <strong>VMI says the stock is worth watching</strong>
                  <p>
                    The price is below the model estimate, but not cheap enough to
                    blindly buy.
                  </p>
                </div>
              </div>
              <div className="note">
                <div className="note-icon">🧪</div>
                <div>
                  <strong>Backtest before action</strong>
                  <p>
                    Move to the backtest page to check whether your chosen
                    strategy has a valid entry signal.
                  </p>
                </div>
              </div>
              <div className="note">
                <div className="note-icon">🛡️</div>
                <div>
                  <strong>Protect against overconfidence</strong>
                  <p>
                    Valuation is an estimate, not a guarantee. Treat the result as
                    a filter, not a prediction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
