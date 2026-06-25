import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (n) => n == null ? '-' : n.toFixed(1) + '%'

const TIER_COLORS = { 1: '#22c55e', 2: '#f59e0b', 3: '#6b7280' }
const TIER_LABELS = { 1: 'FULL LOT', 2: 'HALF LOT', 3: 'QUARTER' }

export default function AutoTrader() {
  const [dash, setDash] = useState(null)
  const [signals, setSignals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sigLoading, setSigLoading] = useState(false)
  const [trading, setTrading] = useState(false)
  const [closing, setClosing] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([
        apiGet('/phase2/auto/dashboard'),
        apiGet('/phase2/auto/wall-signals').catch(() => null),
      ])
      if (d && !d.error) setDash(d)
      if (s && !s.error) setSignals(s)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 120000); return () => clearInterval(t) }, [load])

  async function refreshSignals() {
    setSigLoading(true)
    try {
      const s = await apiGet('/phase2/auto/wall-signals')
      if (s && !s.error) setSignals(s)
    } catch {}
    finally { setSigLoading(false) }
  }

  async function placeTrades() {
    if (!confirm('Place best trades for today? System will pick highest-score signals.')) return
    setTrading(true); setMsg(null)
    try {
      const r = await apiPost('/phase2/auto/trade')
      setMsg(r)
      load()
    } catch (e) { setMsg({ error: e.message }) }
    finally { setTrading(false) }
  }

  async function closeTrades() {
    if (!confirm('Close all open auto-trader positions at current prices?')) return
    setClosing(true); setMsg(null)
    try {
      const r = await apiPost('/phase2/auto/close')
      setMsg(r)
      load()
    } catch (e) { setMsg({ error: e.message }) }
    finally { setClosing(false) }
  }

  async function resetAccount() {
    if (!confirm('Reset auto-trader account to ₹10,00,000? All history will be cleared.')) return
    try {
      await apiPost('/phase2/auto/reset?capital=1000000')
      load()
    } catch {}
  }

  if (loading) return <div className="mut">Loading auto-trader...</div>

  const acct = dash?.account || {}
  const openTrades = dash?.open_trades || []
  const recentTrades = dash?.recent_trades || []
  const dailyPnl = dash?.daily_pnl || []

  return (
    <div style={{ padding: 16 }}>
      <h2>Auto Trader <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.5 }}>ML Mode</span></h2>
      <div className="mode-info" style={{ marginBottom: 16 }}>
        OI Wall Selling (NIFTY + BANKNIFTY) — system scores each wall, places highest-probability trades,
        manages SL & target automatically. Backtested: 71-89% win rate, PF 5.8-16.5.
      </div>

      {/* Account Overview */}
      <div className="cards">
        <div className="c">
          <div className="k">Capital</div>
          <div className="v">{fmt(acct.capital)}</div>
        </div>
        <div className="c">
          <div className="k">Total P&L</div>
          <div className={'v ' + ((acct.total_pnl || 0) >= 0 ? 'ok' : 'err')}>
            {fmt(acct.total_pnl)} <span style={{ fontSize: 12, opacity: 0.7 }}>({acct.return_pct || 0}%)</span>
          </div>
        </div>
        <div className="c">
          <div className="k">Win Rate</div>
          <div className={'v ' + ((acct.win_rate || 0) >= 60 ? 'ok' : 'err')}>{pct(acct.win_rate)}</div>
        </div>
        <div className="c">
          <div className="k">Trades</div>
          <div className="v">{acct.total_trades || 0}
            <span style={{ fontSize: 11, opacity: 0.5 }}> ({acct.wins || 0}W / {acct.losses || 0}L)</span>
          </div>
        </div>
      </div>

      {acct.profit_factor > 0 && (
        <div className="cards" style={{ marginTop: 8 }}>
          <div className="c"><div className="k">Profit Factor</div><div className="v">{acct.profit_factor}x</div></div>
          <div className="c"><div className="k">Max Drawdown</div><div className={'v ' + ((acct.max_drawdown || 0) > 10 ? 'err' : '')}>{pct(acct.max_drawdown)}</div></div>
          <div className="c"><div className="k">Deployed</div><div className="v">{fmt(acct.deployed)}</div></div>
          <div className="c">
            <div className="k">Initial</div>
            <div className="v">{fmt(acct.initial)}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        <button className="take-trade-btn" onClick={placeTrades} disabled={trading || openTrades.length > 0}
          style={{ padding: '10px 24px', fontSize: 13 }}>
          {trading ? 'Placing...' : openTrades.length > 0 ? 'Trades Already Open' : 'Place Best Trades Now'}
        </button>
        {openTrades.length > 0 && (
          <button className="mini" onClick={closeTrades} disabled={closing}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px' }}>
            {closing ? 'Closing...' : `Close All (${openTrades.length})`}
          </button>
        )}
        <button className="mini" onClick={refreshSignals} disabled={sigLoading}>
          {sigLoading ? 'Scanning...' : 'Refresh Signals'}
        </button>
        <button className="mini" onClick={resetAccount} style={{ opacity: 0.5 }}>Reset Account</button>
      </div>

      {/* Execution result */}
      {msg && (
        <div className="panel" style={{ marginBottom: 16 }}>
          {msg.error ? (
            <div className="err">{msg.error}</div>
          ) : msg.status === 'trades_placed' ? (
            <div>
              <div className="ok" style={{ fontWeight: 600, marginBottom: 8 }}>
                ✓ {msg.trades?.length || 0} trades placed — {fmt(msg.total_deployed)} deployed
              </div>
              {msg.trades?.map((t, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                  <b>{t.symbol}</b> {t.action || t.segment} — Entry {fmt(t.premium || t.entry)},
                  SL {fmt(t.stoploss)}, Target {fmt(t.target)}, Score {t.score}
                </div>
              ))}
            </div>
          ) : (
            <div className="mut">{msg.status}: {msg.message || JSON.stringify(msg)}</div>
          )}
        </div>
      )}

      {/* Live Wall Signals */}
      {signals && (
        <div className="panel">
          <h3>OI Wall Selling Signals <span className="mut" style={{ fontWeight: 400 }}>Live</span></h3>
          {['NIFTY', 'BANKNIFTY'].map(sym => {
            const data = signals.signals?.[sym]
            if (!data) return null
            if (data.status !== 'ok') return (
              <div key={sym} className="c" style={{ marginBottom: 12 }}>
                <div className="k">{sym}</div>
                <div className="mut">{data.status}: {data.reason}</div>
              </div>
            )
            return (
              <div key={sym} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  {sym} <span className="mut" style={{ fontWeight: 400 }}>Spot: {fmt(data.spot)}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {data.signals?.filter(s => !s.signal?.includes('STRANGLE')).map((s, i) => (
                    <div key={i} className="signal-card" style={{
                      borderLeftColor: TIER_COLORS[s.tier] || '#333',
                      flex: '1 1 280px', maxWidth: 400,
                    }}>
                      <div className="signal-head">
                        <span className="signal-symbol">{s.signal}</span>
                        {s.tradeable ? (
                          <span className="signal-tier" style={{ color: TIER_COLORS[s.tier], fontSize: 11 }}>
                            {TIER_LABELS[s.tier] || 'SKIP'}
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
                  {(!data.signals || data.signals.length === 0) && (
                    <div className="mut">No wall signals — walls too weak or too close to spot</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Open Positions */}
      {openTrades.length > 0 && (
        <div className="panel">
          <h3>Open Positions ({openTrades.length})</h3>
          <table className="hist">
            <thead>
              <tr><th>Symbol</th><th>Segment</th><th>Action</th><th>Entry</th><th>Qty</th><th>Score</th><th>Tier</th></tr>
            </thead>
            <tbody>
              {openTrades.map((t, i) => (
                <tr key={i}>
                  <td><b>{t.symbol}</b></td>
                  <td><span className={'seg-label ' + t.segment}>{t.segment}</span></td>
                  <td>{t.action}</td>
                  <td>{fmt(t.entry)}</td>
                  <td>{t.qty}</td>
                  <td>{t.score}</td>
                  <td><span style={{ color: TIER_COLORS[t.tier] }}>{TIER_LABELS[t.tier] || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <div className="panel">
          <h3>Recent Trades</h3>
          <table className="hist">
            <thead>
              <tr><th>Date</th><th>Symbol</th><th>Segment</th><th>Action</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recentTrades.map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td><b>{t.symbol}</b></td>
                  <td><span className={'seg-label ' + t.segment}>{t.segment}</span></td>
                  <td>{t.action}</td>
                  <td>{fmt(t.entry)}</td>
                  <td>{t.exit ? fmt(t.exit) : '-'}</td>
                  <td className={t.pnl != null ? (t.pnl >= 0 ? 'ok' : 'err') : ''}>{t.pnl != null ? fmt(t.pnl) : '-'}</td>
                  <td><span className={'tag ' + t.status}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily P&L History */}
      {dailyPnl.length > 0 && (
        <div className="panel">
          <h3>Daily P&L</h3>
          <table className="hist">
            <thead><tr><th>Date</th><th>Trades</th><th>Wins</th><th>P&L</th></tr></thead>
            <tbody>
              {dailyPnl.map((d, i) => (
                <tr key={i}>
                  <td>{d.date}</td>
                  <td>{d.trades}</td>
                  <td>{d.wins}</td>
                  <td className={(d.pnl || 0) >= 0 ? 'ok' : 'err'}>{fmt(d.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Strategy Info */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Strategy Details</h3>
        <div className="answer" style={{ fontSize: 13 }}>
          <b>OI Wall Selling</b> — Sell options at strikes where heavy Open Interest creates "walls".
          Institutional sellers defend these levels, giving 75-89% win rate.<br /><br />
          <b>Smart Score (0-100)</b> — Each trade scored on: distance from spot (0-30pts),
          premium level (0-25pts), day of week (-15 to +20pts), wall type (5-10pts), OI building (0-5pts).<br /><br />
          <b>Tiered Sizing</b> — Score≥55: Full lot, 35-54: Half lot, 20-34: Quarter lot.
          Achieves 94% participation with managed risk.<br /><br />
          <b>Backtested Results (2021-2026)</b><br />
          NIFTY: 83.5% win, PF 6.05, Sharpe 9.51<br />
          BANKNIFTY: 87.5% win, PF 16.58, Sharpe 14.95<br />
          Combined tiered: 70.7% win, PF 5.79, ₹10,277/month per ₹1L
        </div>
      </div>
    </div>
  )
}
