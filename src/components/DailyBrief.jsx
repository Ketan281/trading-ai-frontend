import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (n) => n == null ? '-' : n.toFixed(1) + '%'

const TIER_COLORS = {
  TIER_1A: '#22c55e', TIER_1B: '#86efac', TIER_2A: '#3b82f6',
  TIER_2B: '#60a5fa', TIER_2C: '#f59e0b', NO_TRADE: '#6b7280',
}
const STATE_COLORS = { normal: '#22c55e', caution: '#f59e0b', restricted: '#f97316', halt: '#ef4444' }

export default function DailyBrief() {
  const [brief, setBrief] = useState(null)
  const [risk, setRisk] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [regime, setRegime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoResult, setAutoResult] = useState(null)
  const [executing, setExecuting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [b, r, al, rg] = await Promise.all([
        apiGet('/portfolio/brief'),
        apiGet('/portfolio/risk').catch(() => null),
        apiGet('/portfolio/alerts?unread_only=true').catch(() => ({ alerts: [] })),
        apiGet('/phase2/regime').catch(() => null),
      ])
      setBrief(b)
      setRisk(r)
      setAlerts((al?.alerts || []).slice(0, 5))
      setRegime(rg)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
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

      {/* Index Options Signals */}
      <div className="panel">
        <h3>Index Options Signals</h3>
        <div className="brief-signals">
          {idxSignals.length === 0 && <div className="mut">No index option signals loaded. Data collected during market hours.</div>}
          {idxSignals.map((s, i) => (
            <div key={i} className="signal-card" style={{ borderLeftColor: TIER_COLORS[s.tier] || '#333' }}>
              <div className="signal-head">
                <span className="signal-symbol">{s.symbol}</span>
                {s.tier !== 'NO_TRADE' ? (
                  <span className="signal-tier" style={{ color: TIER_COLORS[s.tier] }}>{s.tier}</span>
                ) : (
                  <span className="signal-tier skip">NO TRADE</span>
                )}
              </div>
              {s.tier !== 'NO_TRADE' && s.action !== 'NO_TRADE' ? (
                <div className="signal-body">
                  <div className="signal-dir">
                    <span className={s.direction === 'BULLISH' ? 'ok' : 'err'}>{s.direction}</span>
                    <span className="signal-wr">{s.win_rate_est}% win rate</span>
                  </div>
                  {s.contract && <div className="signal-contract">{s.contract}</div>}
                  <div className="signal-levels">
                    <span>Entry <b>{fmt(s.ltp)}</b></span>
                    <span>Target <b>{fmt(s.target)}</b></span>
                    <span>SL <b>{fmt(s.stoploss)}</b></span>
                  </div>
                  {s.oi_signal && <div className="signal-oi mut">
                    OI: {s.oi_signal} {s.pcr && `| PCR: ${s.pcr}`} {s.rsi && `| RSI: ${s.rsi}`}
                  </div>}
                </div>
              ) : (
                <div className="signal-reason mut">{s.reason}</div>
              )}
            </div>
          ))}
        </div>
      </div>

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
