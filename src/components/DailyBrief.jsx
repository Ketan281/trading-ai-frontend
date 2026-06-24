import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const TIER_COLORS = {
  TIER_1A: '#22c55e', TIER_1B: '#86efac', TIER_2A: '#3b82f6',
  TIER_2B: '#60a5fa', TIER_2C: '#f59e0b', NO_TRADE: '#6b7280',
}

export default function DailyBrief() {
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoResult, setAutoResult] = useState(null)
  const [executing, setExecuting] = useState(false)

  const load = useCallback(async () => {
    try { setBrief(await apiGet('/portfolio/brief')) }
    catch { /* keep last */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

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

  if (loading) return <div className="mut">Generating today's trading brief...</div>
  if (!brief) return <div className="panel"><div className="mut">Could not load daily brief.</div></div>

  const ms = brief.market_status || {}
  const idxSignals = (brief.signals?.index_options || []).filter(s => !s.error)
  const plan = brief.plan || []

  return (
    <div>
      <h2>Daily Brief</h2>
      <div className="crumb">Today's ML-generated trading plan across all segments</div>

      <div className="brief-status-bar">
        <div className="brief-status-item">
          <span className="brief-status-label">Market</span>
          <span className={'brief-status-val ' + (ms.status === 'open' ? 'ok' : '')}>
            {ms.status === 'open' ? 'OPEN' : ms.status === 'pre_market'
              ? 'Pre-market (' + ms.opens_in + ')' : ms.reason || 'Closed'}
          </span>
        </div>
        <div className="brief-status-item">
          <span className="brief-status-label">Capital</span>
          <span className="brief-status-val">{fmt(brief.wallet?.balance)}</span>
        </div>
        <div className="brief-status-item">
          <span className="brief-status-label">Open Positions</span>
          <span className="brief-status-val">{brief.open_positions}</span>
        </div>
        <div className="brief-status-item">
          <span className="brief-status-label">Risk at Stake</span>
          <span className="brief-status-val">{fmt(brief.risk_summary?.total_risk_amount)}</span>
        </div>
      </div>

      <div className="panel">
        <h3>Index Options Signals</h3>
        <div className="brief-signals">
          {idxSignals.length === 0 && <div className="mut">No index option signals loaded.</div>}
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
                </div>
              ) : (
                <div className="signal-reason mut">{s.reason}</div>
              )}
            </div>
          ))}
        </div>
      </div>

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
    </div>
  )
}
