import { createFileRoute } from '@tanstack/react-router'
import "./styles.css"

export const Route = createFileRoute('/(home)/')({ component: App })

function App() {
  return (
    <div className="page home-page">
      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="pulse" /> Strategy signals for serious retail
            investors
          </div>
          <h1>Know what to watch before you buy.</h1>
          <p>
            FoxelSignal combines valuation, momentum and backtesting into one
            simple dashboard — so you can filter stocks, test strategies, and
            act with more discipline.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#start">
              Try the demo
            </a>
            <a className="btn btn-secondary" href="#workflow">
              See how it works
            </a>
          </div>
          <div className="trust-row">
            <span>✓ Valuation model input</span>
            <span>✓ Strategy backtesting</span>
            <span>✓ Buy/Sell signal tracking</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="dashboard-card">
            <div className="dash-top">
              <div className="dash-title">
                <strong>AAPL Strategy Snapshot</strong>
                <span>Updated 26 Apr 2026</span>
              </div>
              <div className="signal-badge">Watchlist</div>
            </div>
            <div className="ticker-row">
              <div className="ticker-left">
                <strong>Intrinsic Value</strong>
                <span>VMI fair value estimate</span>
              </div>
              <div className="score">
                $184.20 <small>+12.8% upside</small>
              </div>
            </div>
            <div className="chart-box">
              <div className="chart-grid" />
              <div className="chart-line" />
            </div>
            <div className="mini-metrics">
              <div className="metric">
                <span>Signal</span>
                <strong>Hold</strong>
              </div>
              <div className="metric">
                <span>Backtest CAGR</span>
                <strong>18.4%</strong>
              </div>
              <div className="metric">
                <span>Risk</span>
                <strong>Medium</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className="section-head">
          <h2>Built for investors who want a system, not noise.</h2>
          <p>
            Most investing apps give you charts, news and opinions. FoxelSignal
            focuses on three things: value, strategy, and repeatable
            decision-making.
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="icon">🧮</div>
            <h3>VMI Valuation</h3>
            <p>
              Estimate intrinsic value using valuation inputs such as cash flow,
              growth rate, debt, cash and discount rate.
            </p>
          </div>
          <div className="feature-card">
            <div className="icon">📈</div>
            <h3>Strategy Signals</h3>
            <p>
              Track buy, sell and hold signals generated from your selected
              technical strategy and ruleset.
            </p>
          </div>
          <div className="feature-card">
            <div className="icon">🧪</div>
            <h3>Backtesting</h3>
            <p>
              Test whether a strategy has worked historically before trusting it
              on your current watchlist.
            </p>
          </div>
        </div>
      </section>
      <section id="workflow">
        <div className="workflow">
          <div>
            <h2>From stock idea to decision.</h2>
            <p>
              FoxelSignal is designed around a simple workflow: screen the
              stock, check the value, validate the strategy, then monitor the
              signal.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <div>
                <strong>Enter a ticker</strong>
                <span>Start with a stock symbol from your watchlist.</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div>
                <strong>Review VMI valuation</strong>
                <span>
                  Compare market price against estimated intrinsic value.
                </span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div>
                <strong>Run strategy backtest</strong>
                <span>
                  Check historical returns, drawdowns, win rate and trade count.
                </span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <div>
                <strong>Monitor signal</strong>
                <span>
                  Keep only the stocks that pass your valuation and strategy
                  filters.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="vmi">
        <div className="section-head">
          <h2>Preview the core pages.</h2>
          <p>
            The homepage introduces the product. The next mockups will go deeper
            into the VMI result page and the strategy backtest page.
          </p>
        </div>
        <div className="preview-grid">
          <div className="preview-card">
            <h3>VMI Page</h3>
            <p>
              A valuation dashboard showing intrinsic value, discount/premium,
              cash flow assumptions and confidence notes.
            </p>
            <div className="mock-table">
              <div className="head">
                <span>Metric</span>
                <span>Value</span>
                <span>Status</span>
              </div>
              <div>
                <span>Intrinsic Value</span>
                <span>$184.20</span>
                <span className="positive">Undervalued</span>
              </div>
              <div>
                <span>Market Price</span>
                <span>$162.80</span>
                <span>Live</span>
              </div>
              <div>
                <span>Discount</span>
                <span>11.6%</span>
                <span className="positive">Attractive</span>
              </div>
            </div>
          </div>
          <div className="preview-card" id="backtest">
            <h3>Backtest Page</h3>
            <p>
              A strategy performance dashboard showing returns, drawdowns, trade
              history and latest signal.
            </p>
            <div className="mock-table">
              <div className="head">
                <span>Metric</span>
                <span>Result</span>
                <span>Status</span>
              </div>
              <div>
                <span>CAGR</span>
                <span>18.4%</span>
                <span className="positive">Strong</span>
              </div>
              <div>
                <span>Max Drawdown</span>
                <span>-22.1%</span>
                <span className="negative">Watch</span>
              </div>
              <div>
                <span>Latest Signal</span>
                <span>Hold</span>
                <span>Neutral</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="start">
        <div className="cta-band">
          <h2>Stop guessing. Start testing.</h2>
          <p>
            FoxelSignal helps you turn stock ideas into structured decisions by
            combining valuation logic, technical strategy signals and historical
            performance testing.
          </p>
          <a className="btn btn-primary" href="#">
            Launch FoxelSignal Demo
          </a>
        </div>
      </section>
    </div>

  )
}
