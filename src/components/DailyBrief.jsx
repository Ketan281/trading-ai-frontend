import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (n) => n == null ? '-' : n.toFixed(1) + '%'

const TIER_COLORS = {
  TIER_1A: '#22c55e', TIER_1B: '#86efac', TIER_2A: '#3b82f6',
  TIER_2B: '#60a5fa', TIER_2C: '#f59e0b', NO_TRADE: '#6b7280',
}
const WALL_TIER_COLORS = { 1: '#22c55e', 2: '#f59e0b', 3: '#6b7280' }
const WALL_TIER_LABELS = { 1: 'FULL LOT', 2: 'HALF LOT', 3: 'QUARTER' }
const STATE_COLORS = { normal: '#22c55e', caution: '#f59e0b', restricted: '#f97316', halt: '#ef4444' }

export default function DailyBrief() {
  const [brief, setBrief] = useState(null)
  const [risk, setRisk] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [regime, setRegime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoResult, setAutoResult] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [autoDash, setAutoDash] = useState(null)
  const [wallSignals, setWallSignals] = useState(null)

  const load = useCallback(async () => {
    try {
      const [b, r, al, rg, ad, ws] = await Promise.all([
        apiGet('/portfolio/brief'),
        apiGet('/portfolio/risk').catch(() => null),
        apiGet('/portfolio/alerts?unread_only=true').catch(() => ({ alerts: [] })),
        apiGet('/phase2/regime').catch(() => null),
        apiGet('/phase2/auto/dashboard').catch(() => null),
        apiGet('/phase2/auto/wall-signals').catch(() => null),
      ])
      setBrief(b)
      setRisk(r)
      setAlerts((al?.alerts || []).slice(0, 5))
      setRegime(rg)
      if (ad && !ad.error) setAutoDash(ad)
      if (ws && !ws.error) setWallSignals(ws)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 120000)
    return () => clearInterval(t)
  }, [load])

  async function dryRun() {
    setExecuting(true)
    try { setAutoResult(await apiPost('/portfolio/auto-trade?dry_run=true')) }
    catch (e) { setAutoResult({ error: e.message }) }
    finally { setExecuting(false) }
  }

  async function executeAll() {
    if (!confirm('Execute all planned trades with real (paper) capital?')) return
    setExecuting(true)
    try { setAutoResult(await apiPost('/portfolio/auto-trade?dry_run=false')) }
    catch (e) { setAutoResult({ error: e.message }) }
    finally { setExecuting(false) }
  }

  if (loading) return <div className="mut">Loading dashboard...</div>
  if (!brief) return <div className="panel"><div className="mut">Could not load daily brief.</div></div>

  const ms = brief.market_status || {}
  const idxSignals = (brief.signals?.index_options || []).filter(s => !s.error)
  const plan = brief.plan || []
  const eq = risk?.equity || {}
  const exp = risk?.exposure || {}
  const perf = risk?.performance || {}
  const riskState = regime?.psychology_state || risk?.psychology_state || 'normal'

  return (
    <div>
      <h2>Dashboard</h2>

      {/* Status bar */}
      <div className="brief-status-bar">
        <div className="brief-status-item">
          <span className="brief-status-label">Market</span>
          <span className={'brief-status-val ' + (ms.status === 'open' ? 'ok' : '')}>
            {ms.status === 'open' ? 'OPEN' : ms.status === 'pre_market'
              ? 'Pre-market (' + ms.opens_in + ')' : ms.reason || 'Closed'}
          </span>
        </div>
        {regime && (
          <div className="brief-status-item">
            <span className="brief-status-label">Regime</span>
            <span className="brief-status-val">{regime.regime || regime.label || '-'}</span>
          </div>
        )}
        <div className="brief-status-item">
          <span className="brief-status-label">Capital</span>
          <span className="brief-status-val">{fmt(brief.wallet?.balance)}</span>
        </div>
        <div className="brief-status-item">
          <span className="brief-status-label">Positions</span>
          <span className="brief-status-val">{brief.open_positions || 0}</span>
        </div>
        <div className="brief-status-item">
          <span className="brief-status-label">Risk State</span>
          <span className="brief-status-val" style={{ color: STATE_COLORS[riskState] || '#9ca3af' }}>
            {riskState.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="home-alerts">
          {alerts.map(a => (
            <div key={a.id} className={'home-alert ' + a.severity}>
              <span className={'alert-severity ' + a.severity}>{a.severity}</span>
              <span>{a.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Risk overview cards */}
      {risk && (
        <div className="cards">
          <div className="c">
            <div className="k">Total Equity</div>
            <div className="v">{fmt(eq.total || brief.wallet?.balance)}</div>
          </div>
          <div className="c">
            <div className="k">Unrealized P&L</div>
            <div className={'v ' + ((eq.unrealized_pnl || 0) >= 0 ? 'ok' : 'err')}>{fmt(eq.unrealized_pnl)}</div>
          </div>
          <div className="c">
            <div className="k">Exposure</div>
            <div className={'v ' + ((exp.leverage || 0) > 2 ? 'err' : '')}>{(exp.leverage || 0).toFixed(2)}x</div>
          </div>
          <div className="c">
            <div className="k">Drawdown</div>
            <div className={'v ' + ((perf.drawdown_pct || 0) < -5 ? 'err' : 'ok')}>{pct(perf.drawdown_pct)}</div>
          </div>
        </div>
      )}

      {/* Auto Trader (ML Mode) */}
      {autoDash?.account && (
        <div className="panel">
          <h3>Auto Trader (ML Mode)</h3>
          <div className="cards">
            <div className="c">
              <div className="k">Capital</div>
              <div className="v">{fmt(autoDash.account.capital)}</div>
            </div>
            <div className="c">
              <div className="k">Total P&L</div>
              <div className={'v ' + ((autoDash.account.total_pnl || 0) >= 0 ? 'ok' : 'err')}>
                {fmt(autoDash.account.total_pnl)} ({autoDash.account.return_pct}%)
              </div>
            </div>
            <div className="c">
              <div className="k">Win Rate</div>
              <div className={'v ' + ((autoDash.account.win_rate || 0) >= 60 ? 'ok' : 'err')}>
                {pct(autoDash.account.win_rate)}
              </div>
            </div>
            <div className="c">
              <div className="k">Trades</div>
              <div className="v">{autoDash.account.total_trades} ({autoDash.account.wins}W / {autoDash.account.losses}L)</div>
            </div>
          </div>
          {autoDash.account.profit_factor > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
              <span><span style={{ opacity: 0.5 }}>Profit Factor</span> {autoDash.account.profit_factor}x</span>
              <span><span style={{ opacity: 0.5 }}>Max DD</span> {pct(autoDash.account.max_drawdown)}</span>
              <span><span style={{ opacity: 0.5 }}>Deployed</span> {fmt(autoDash.account.deployed)}</span>
            </div>
          )}
          {autoDash.open_trades?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="k">Open Positions ({autoDash.open_trades.length})</div>
              <table className="hist" style={{ marginTop: 4 }}>
                <thead><tr><th>Symbol</th><th>Segment</th><th>Action</th><th>Entry</th><th>Qty</th><th>Score</th></tr></thead>
                <tbody>
                  {autoDash.open_trades.map((t, i) => (
                    <tr key={i}>
                      <td>{t.symbol}</td>
                      <td><span className={'seg-label ' + t.segment}>{t.segment}</span></td>
                      <td>{t.action}</td>
                      <td>{fmt(t.entry)}</td>
                      <td>{t.qty}</td>
                      <td>{t.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {autoDash.recent_trades?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="k">Recent Trades</div>
              <table className="hist" style={{ marginTop: 4 }}>
                <thead><tr><th>Date</th><th>Symbol</th><th>Segment</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Status</th></tr></thead>
                <tbody>
                  {autoDash.recent_trades.slice(0, 10).map((t, i) => (
                    <tr key={i}>
                      <td>{t.date}</td>
                      <td>{t.symbol}</td>
                      <td><span className={'seg-label ' + t.segment}>{t.segment}</span></td>
                      <td>{fmt(t.entry)}</td>
                      <td>{t.exit ? fmt(t.exit) : '-'}</td>
                      <td className={t.pnl >= 0 ? 'ok' : 'err'}>{t.pnl != null ? fmt(t.pnl) : '-'}</td>
                      <td><span className={'tag ' + t.status}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OI Wall Selling Signals (ML-trained, 71-89% win rate) */}
      {wallSignals && (
        <div className="panel">
          <h3>OI Wall Selling Signals <span className="mut" style={{ fontWeight: 400, fontSize: 12 }}>ML-trained | 71-89% win rate</span></h3>
          {['NIFTY', 'BANKNIFTY'].map(sym => {
            const data = wallSignals.signals?.[sym]
            if (!data) return null
            if (data.status !== 'ok') return (
              <div key={sym} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{sym}</div>
                <div className="mut">{data.status}: {data.reason || 'No signals'}</div>
              </div>
            )
            const sigs = (data.signals || []).filter(s => !s.signal?.includes('STRANGLE'))
            return (
              <div key={sym} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  {sym} <span className="mut" style={{ fontWeight: 400 }}>Spot: {fmt(data.spot)}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {sigs.map((s, i) => (
                    <div key={i} className="signal-card" style={{
                      borderLeftColor: WALL_TIER_COLORS[s.tier] || '#333',
                      flex: '1 1 280px', maxWidth: 400,
                    }}>
                      <div className="signal-head">
                        <span className="signal-symbol">{s.signal}</span>
                        {s.tradeable ? (
                          <span className="signal-tier" style={{ color: WALL_TIER_COLORS[s.tier], fontSize: 11 }}>
                            {WALL_TIER_LABELS[s.tier] || 'SKIP'}
                          </span>
                        ) : (
                          <span className="signal-tier skip" style={{ fontSize: 11 }}>SKIP</span>
                        )}
                      </div>
                      <div className="signal-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="ok" style={{ fontWeight: 700, fontSize: 18 }}>{s.win_pct}%</span>
                          <span className="mut">win rate</span>
                        </div>
                        <div className="signal-levels" style={{ marginTop: 8 }}>
                          <span>Sell <b>{fmt(s.premium)}</b></span>
                          <span>Target <b>{fmt(s.target)}</b></span>
                          <span>SL <b>{fmt(s.stoploss)}</b></span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                          <span>Funds: {fmt(s.funds_required)}</span>
                          <span>Score: {s.score}</span>
                          <span>Dist: {s.dist_pct?.toFixed(1)}%</span>
                          <span>{s.lots} lot{s.lots > 1 ? 's' : ''}</span>
                        </div>
                        {s.oi_building && <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>OI Building ↑</div>}
                      </div>
                    </div>
                  ))}
                  {sigs.length === 0 && (
                    <div className="mut">No wall signals — walls too weak or too close to spot</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Equity picks */}
      {brief.signals?.equity && brief.signals.equity.length > 0 && !brief.signals.equity[0]?.error && (
        <div className="panel">
          <h3>Equity Picks</h3>
          <div className="brief-equity-picks">
            {brief.signals.equity.slice(0, 5).map((t, i) => (
              <div key={i} className="eq-pick">
                <span className="eq-pick-sym">{t.symbol}</span>
                <span className={'eq-pick-side ' + (t.side === 'long' ? 'ok' : 'err')}>{t.side}</span>
                <span className="eq-pick-conf">{t.confidence || t.score || '-'}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action plan */}
      {plan.length > 0 && (
        <div className="panel">
          <h3>Action Plan ({plan.length} items)</h3>
          <div className="plan-list">
            {plan.map((p, i) => (
              <div key={i} className={'plan-item ' + (p.segment === 'exit' ? 'exit' : '')}>
                <div className="plan-action">{p.action}</div>
                <div className="plan-details">
                  {p.win_rate && <span>WR: {p.win_rate}%</span>}
                  {p.risk_amount > 0 && <span>Risk: {fmt(p.risk_amount)}</span>}
                  {p.reason && <span>{p.reason}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="plan-actions">
            <button className="mini" onClick={dryRun} disabled={executing}>
              {executing ? 'Running...' : 'Preview (Dry Run)'}
            </button>
            <button className="take-trade-btn"
              style={{ marginTop: 0, width: 'auto', padding: '10px 24px', fontSize: 13 }}
              onClick={executeAll} disabled={executing}>
              Execute All Trades
            </button>
          </div>
        </div>
      )}

      {/* Execution result */}
      {autoResult && (
        <div className="panel">
          <h3>Execution Result</h3>
          {autoResult.error ? (
            <div className="mut err">{autoResult.error}</div>
          ) : (
            <div>
              <div className="tag" style={{ marginBottom: 8 }}>{autoResult.status}</div>
              {(autoResult.executed || []).map((e, i) => (
                <div key={i} className={'auto-msg ' + (e.action === 'OPENED' ? 'ok'
                  : e.action.includes('FAIL') ? 'err' : '')}>
                  <b>{e.action}</b>
                  {e.would_execute && <span className="mut"> {e.would_execute.action}</span>}
                  {e.error && <span className="err"> {e.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk limits summary */}
      {risk?.risk_limits && (
        <div className="panel">
          <h3>Risk Limits</h3>
          <div className="risk-metrics">
            <div className="risk-metric">
              <span className="risk-metric-label">Positions</span>
              <span className="risk-metric-val">{risk.risk_limits.positions_used} / {risk.risk_limits.max_positions}</span>
            </div>
            <div className="risk-metric">
              <span className="risk-metric-label">Leverage</span>
              <span className={'risk-metric-val ' + ((exp.leverage || 0) > 2 ? 'err' : '')}>{(exp.leverage || 0).toFixed(2)}x</span>
            </div>
            <div className="risk-metric">
              <span className="risk-metric-label">Max Daily Loss</span>
              <span className="risk-metric-val">{pct(risk.risk_limits.max_daily_loss_pct)}</span>
            </div>
            <div className="risk-metric">
              <span className="risk-metric-label">At Stake</span>
              <span className="risk-metric-val">{fmt(brief.risk_summary?.total_risk_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
