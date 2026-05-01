import { createFileRoute } from '@tanstack/react-router'
import "./styles.css"

export const Route = createFileRoute('/(home)/backtest/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='backtest-page'>
      <section className="topbar">
        <div>
          <div className="eyebrow">
            <span className="pulse" /> Strategy validation dashboard
          </div>
          <h1>Test the strategy before trusting the signal.</h1>
          <p>
            Backtest your selected trading rules against historical price data,
            then compare the current signal with past performance, risk and
            drawdown.
          </p>
        </div>
        <div className="control-card">
          <div className="control-grid">
            <div>
              <label htmlFor="ticker">Ticker</label>
              <input id="ticker" type="text" defaultValue="AAPL" />
            </div>
            <div>
              <label htmlFor="strategy">Strategy</label>
              <select id="strategy">
                <option>Ichimoku Cloud Trend</option>
                <option>RSI + Bollinger Reversal</option>
                <option>MACD Momentum Swing</option>
                <option>VMI + Technical Confirmation</option>
              </select>
            </div>
            <button className="btn">Run</button>
          </div>
        </div>
      </section>
      <section style={{
        padding: "unset"
      }}>
        <div className="dashboard-grid">
          <div className="card card-pad">
            <div className="strategy-head">
              <div className="strategy-title">
                <h2>AAPL · Ichimoku Cloud Trend</h2>
                <p>
                  5-year backtest · Daily candles · Long-only · One trade at a
                  time
                </p>
              </div>
              <div className="signal-badge">Latest Signal: Hold</div>
            </div>
            <div className="chart-card">
              <div className="chart-top">
                <div>
                  <span>Strategy equity</span>
                  <strong className="positive">+86.4%</strong>
                </div>
                <div>
                  <span>Buy &amp; hold</span>
                  <strong>+72.1%</strong>
                </div>
              </div>
              <div className="chart-area">
                <div className="chart-grid-bg" />
                <div className="equity-line" />
                <div className="buy-dot d1" />
                <div className="sell-dot d2" />
                <div className="buy-dot d3" />
                <div className="sell-dot d4" />
                <div className="buy-dot d5" />
              </div>
            </div>
          </div>
          <div className="verdict-card">
            <div>
              <h3>Backtest verdict</h3>
              <p>
                The strategy has outperformed buy-and-hold in this sample, but
                drawdown is still meaningful.
              </p>
            </div>
            <div className="verdict-main">
              <span>Decision support</span>
              <strong>Valid, but wait</strong>
              <p>
                Performance is acceptable, but the current signal is Hold. No new
                entry until a fresh Buy signal appears.
              </p>
            </div>
            <div className="rule-stack">
              <div className="rule">
                <div className="rule-icon">✅</div>
                <div>
                  <strong>Outperformed benchmark</strong>
                  <small>Strategy return higher than buy-and-hold.</small>
                </div>
                <span className="pass">Pass</span>
              </div>
              <div className="rule">
                <div className="rule-icon">⚠️</div>
                <div>
                  <strong>Drawdown risk</strong>
                  <small>Maximum drawdown remains above comfort zone.</small>
                </div>
                <span className="wait">Watch</span>
              </div>
              <div className="rule">
                <div className="rule-icon">⏳</div>
                <div>
                  <strong>Current entry signal</strong>
                  <small>No active buy trigger detected today.</small>
                </div>
                <span className="wait">Wait</span>
              </div>
            </div>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card">
            <span>Total Return</span>
            <strong className="positive">+86.4%</strong>
            <p>Strategy return over the tested period.</p>
          </div>
          <div className="metric-card">
            <span>CAGR</span>
            <strong className="positive">13.3%</strong>
            <p>Annualized return from backtest.</p>
          </div>
          <div className="metric-card">
            <span>Max Drawdown</span>
            <strong className="negative">-24.8%</strong>
            <p>Largest peak-to-trough decline.</p>
          </div>
          <div className="metric-card">
            <span>Win Rate</span>
            <strong>58.1%</strong>
            <p>Percentage of closed winning trades.</p>
          </div>
          <div className="metric-card">
            <span>Trades</span>
            <strong>31</strong>
            <p>Total completed trades in sample.</p>
          </div>
          <div className="metric-card">
            <span>Avg Trade</span>
            <strong className="positive">+2.7%</strong>
            <p>Average return per closed trade.</p>
          </div>
          <div className="metric-card">
            <span>Exposure</span>
            <strong>46%</strong>
            <p>Time spent in the market.</p>
          </div>
          <div className="metric-card">
            <span>Risk Rating</span>
            <strong className="neutral">Medium</strong>
            <p>Based on drawdown and volatility.</p>
          </div>
        </div>
        <div className="section-grid">
          <div className="card card-pad">
            <div className="card-title">
              <h3>Strategy rules</h3>
              <span>Current setup</span>
            </div>
            <div className="parameter-grid">
              <div className="parameter-card">
                <span>Entry rule</span>
                <strong>Cloud breakout</strong>
              </div>
              <div className="parameter-card">
                <span>Confirmation</span>
                <strong>Tenkan &gt; Kijun</strong>
              </div>
              <div className="parameter-card">
                <span>Exit rule</span>
                <strong>Bearish cross</strong>
              </div>
              <div className="parameter-card">
                <span>Position size</span>
                <strong>100%</strong>
              </div>
              <div className="parameter-card">
                <span>Stop loss</span>
                <strong>None</strong>
              </div>
              <div className="parameter-card">
                <span>Trade mode</span>
                <strong>Long-only</strong>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title">
              <h3>Plain-English summary</h3>
              <span>Interpretation</span>
            </div>
            <div className="note-stack">
              <div className="note">
                <div className="note-icon">🧪</div>
                <div>
                  <strong>The strategy has historical edge</strong>
                  <p>
                    It beat buy-and-hold in this sample, which makes it worth
                    monitoring further.
                  </p>
                </div>
              </div>
              <div className="note">
                <div className="note-icon">🛡️</div>
                <div>
                  <strong>Risk is not low</strong>
                  <p>
                    The drawdown shows this strategy can still sit through painful
                    declines.
                  </p>
                </div>
              </div>
              <div className="note">
                <div className="note-icon">🎯</div>
                <div>
                  <strong>No action until a buy signal</strong>
                  <p>
                    The backtest validates the rules, but the current signal does
                    not support a fresh entry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="section-grid">
          <div className="card card-pad">
            <div className="card-title">
              <h3>Recent trade history</h3>
              <span>Last 5 closed trades</span>
            </div>
            <div className="table">
              <div className="row head">
                <span>Entry</span>
                <span>Exit</span>
                <span>Return</span>
                <span>Result</span>
              </div>
              <div className="row">
                <span>12 Feb 2026</span>
                <span>08 Apr 2026</span>
                <span className="positive">+8.4%</span>
                <span className="tag tag-buy">Win</span>
              </div>
              <div className="row">
                <span>03 Nov 2025</span>
                <span>19 Dec 2025</span>
                <span className="negative">-3.1%</span>
                <span className="tag tag-sell">Loss</span>
              </div>
              <div className="row">
                <span>21 Jul 2025</span>
                <span>17 Sep 2025</span>
                <span className="positive">+11.8%</span>
                <span className="tag tag-buy">Win</span>
              </div>
              <div className="row">
                <span>14 Mar 2025</span>
                <span>30 May 2025</span>
                <span className="positive">+5.6%</span>
                <span className="tag tag-buy">Win</span>
              </div>
              <div className="row">
                <span>05 Jan 2025</span>
                <span>28 Jan 2025</span>
                <span className="negative">-2.7%</span>
                <span className="tag tag-sell">Loss</span>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title">
              <h3>Latest signal log</h3>
              <span>Most recent checks</span>
            </div>
            <div className="table">
              <div className="row head">
                <span>Date</span>
                <span>Signal</span>
                <span>Price</span>
                <span>Action</span>
              </div>
              <div className="row">
                <span>26 Apr 2026</span>
                <span className="tag tag-hold">Hold</span>
                <span>$162.80</span>
                <span>Wait</span>
              </div>
              <div className="row">
                <span>25 Apr 2026</span>
                <span className="tag tag-hold">Hold</span>
                <span>$161.90</span>
                <span>Wait</span>
              </div>
              <div className="row">
                <span>24 Apr 2026</span>
                <span className="tag tag-hold">Hold</span>
                <span>$160.72</span>
                <span>Wait</span>
              </div>
              <div className="row">
                <span>08 Apr 2026</span>
                <span className="tag tag-sell">Sell</span>
                <span>$168.30</span>
                <span>Exit</span>
              </div>
              <div className="row">
                <span>12 Feb 2026</span>
                <span className="tag tag-buy">Buy</span>
                <span>$155.20</span>
                <span>Enter</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
