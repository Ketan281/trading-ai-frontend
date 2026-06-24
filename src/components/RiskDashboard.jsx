import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (n) => n == null ? '-' : n.toFixed(1) + '%'

export default function RiskDashboard() {
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try { setRisk(await apiGet('/portfolio/risk')) }
    catch { /* keep last */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  if (loading) return <div className="mut">Loading risk dashboard...</div>
  if (!risk) return <div className="panel"><div className="mut">Could not load risk data.</div></div>

  const eq = risk.equity || {}
  const exp = risk.exposure || {}
  const perf = risk.performance || {}
  const alerts = risk.alerts || []
  const limits = risk.risk_limits || {}
  const positions = risk.open_positions || []

  return (
    <div>
      <h2>Risk Dashboard</h2>
      <div className="crumb">Real-time portfolio risk, exposure, and position monitoring</div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="risk-alerts">
          {alerts.map((a, i) => (
            <div key={i} className={'risk-alert ' + a.severity}>{a.message}</div>
          ))}
        </div>
      )}

      {/* Equity Overview */}
      <div className="cards">
        <div className="c">
          <div className="k">Total Equity</div>
          <div className="v">{fmt(eq.total)}</div>
        </div>
        <div className="c">
          <div className="k">Cash Available</div>
          <div className="v">{fmt(eq.cash)} <span className="mut">({pct(eq.cash_pct)})</span></div>
        </div>
        <div className="c">
          <div className="k">Invested</div>
          <div className="v">{fmt(eq.invested)}</div>
        </div>
        <div className="c">
          <div className="k">Unrealized P&L</div>
          <div className={'v ' + ((eq.unrealized_pnl || 0) >= 0 ? 'ok' : 'err')}>
            {fmt(eq.unrealized_pnl)}
          </div>
        </div>
      </div>

      {/* Exposure & Concentration */}
      <div className="panel">
        <h3>Exposure</h3>
        <div className="risk-metrics">
          <div className="risk-metric">
            <span className="risk-metric-label">Total Exposure</span>
            <span className="risk-metric-val">{fmt(exp.total)}</span>
          </div>
          <div className="risk-metric">
            <span className="risk-metric-label">Leverage</span>
            <span className={'risk-metric-val ' + ((exp.leverage || 0) > 2 ? 'err' : '')}>{(exp.leverage || 0).toFixed(2)}x</span>
          </div>
          <div className="risk-metric">
            <span className="risk-metric-label">Positions Used</span>
            <span className="risk-metric-val">{limits.positions_used} / {limits.max_positions}</span>
          </div>
          <div className="risk-metric">
            <span className="risk-metric-label">Drawdown</span>
            <span className={'risk-metric-val ' + ((perf.drawdown_pct || 0) < -5 ? 'err' : (perf.drawdown_pct || 0) < -2 ? 'warn' : 'ok')}>
              {pct(perf.drawdown_pct)}
            </span>
          </div>
        </div>

        {/* Concentration bars */}
        {exp.concentration && Object.keys(exp.concentration).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="k" style={{ marginBottom: 8 }}>Concentration by Segment</div>
            {Object.entries(exp.concentration).map(([seg, val]) => (
              <div key={seg} className="conc-row">
                <span className="conc-label">{seg}</span>
                <div className="conc-bar-wrap">
                  <div className={'conc-bar ' + (val > 50 ? 'over' : '')} style={{ width: Math.min(val, 100) + '%' }} />
                </div>
                <span className="conc-pct">{pct(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Summary */}
      <div className="panel">
        <h3>Performance (30d)</h3>
        <div className="cards" style={{ marginTop: 0 }}>
          <div className="c">
            <div className="k">Total P&L</div>
            <div className={'v ' + ((perf.total_pnl || 0) >= 0 ? 'ok' : 'err')}>{fmt(perf.total_pnl)}</div>
          </div>
          <div className="c">
            <div className="k">30d P&L</div>
            <div className={'v ' + ((perf.pnl_30d || 0) >= 0 ? 'ok' : 'err')}>{fmt(perf.pnl_30d)}</div>
          </div>
          <div className="c">
            <div className="k">Win Rate (30d)</div>
            <div className={'v ' + ((perf.win_rate_30d || 0) >= 60 ? 'ok' : 'err')}>{pct(perf.win_rate_30d)}</div>
          </div>
          <div className="c">
            <div className="k">Trades (30d)</div>
            <div className="v">{perf.trades_30d || 0}</div>
          </div>
        </div>
      </div>

      {/* Risk Limits */}
      <div className="panel">
        <h3>Risk Limits</h3>
        <div className="risk-limits-grid">
          <div className="risk-limit">
            <span className="k">Max Daily Loss</span>
            <span>{pct(limits.max_daily_loss_pct)}</span>
          </div>
          <div className="risk-limit">
            <span className="k">Max Positions</span>
            <span>{limits.max_positions}</span>
          </div>
          <div className="risk-limit">
            <span className="k">Max Single Position</span>
            <span>{pct(limits.max_single_position_pct)}</span>
          </div>
          <div className="risk-limit">
            <span className="k">Max Segment Concentration</span>
            <span>{pct(limits.max_segment_concentration_pct)}</span>
          </div>
        </div>
      </div>

      {/* Open Positions Detail */}
      <div className="panel">
        <h3>Open Positions ({positions.length})</h3>
        {positions.length === 0 ? (
          <div className="mut">No open positions.</div>
        ) : (
          <table className="hist">
            <thead>
              <tr><th>Instrument</th><th>Side</th><th>Entry</th><th>Current</th><th>SL / Tgt</th><th>P&L</th><th>P&L %</th></tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id}>
                  <td>{p.symbol}<div className="mut">{p.segment}</div></td>
                  <td>{p.side}</td>
                  <td>{fmt(p.entry)}</td>
                  <td>{fmt(p.current)}</td>
                  <td>{fmt(p.stop)} / {fmt(p.target)}</td>
                  <td className={(p.pnl || 0) >= 0 ? 'ok' : 'err'}>{fmt(p.pnl)}</td>
                  <td className={(p.pnl_pct || 0) >= 0 ? 'ok' : 'err'}>{pct(p.pnl_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
