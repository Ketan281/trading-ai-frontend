import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = n => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function PaperTrading() {
  const [metrics, setMetrics] = useState(null)
  const [positions, setPositions] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [tab, setTab] = useState('overview')
  const [err, setErr] = useState(null)

  const load = async () => {
    try {
      const [m, p, r] = await Promise.all([
        apiGet('/phase2/paper/metrics'),
        apiGet('/phase2/paper/positions?status=open'),
        apiGet('/phase2/paper/readiness'),
      ])
      setMetrics(m)
      setPositions(p.positions || [])
      setReadiness(r)
      setErr(null)
    } catch (e) { setErr(e.message) }
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  if (err) return <div className="answer" style={{ color: '#ef4444' }}>Error: {err}</div>

  const tabs = ['overview', 'positions', 'closed']

  return (
    <div style={{ padding: 16 }}>
      <h2>Paper Trading</h2>
      <div className="crumb">Forward-test simulation — 1000 trades before live deployment</div>

      {readiness && (
        <div className="c" style={{ marginBottom: 16, borderLeft: `3px solid ${readiness.ready ? '#22c55e' : '#f59e0b'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="k">Live Readiness</div>
              <div className="v" style={{ color: readiness.ready ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
                {readiness.ready ? 'READY' : 'NOT READY'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {readiness.trades_completed}/{readiness.trades_needed} trades
              </div>
              <div style={{ background: '#1e293b', borderRadius: 4, height: 8, width: 120, marginTop: 4 }}>
                <div style={{
                  width: (readiness.progress_pct || 0) + '%',
                  background: readiness.ready ? '#22c55e' : '#f59e0b',
                  height: '100%', borderRadius: 4,
                }} />
              </div>
            </div>
          </div>
          {readiness.reasons && readiness.reasons.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
              {readiness.reasons.map((r, i) => <div key={i}>• {r}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t ? '#3b82f6' : '#1e293b', color: '#e2e8f0',
              fontSize: 12, fontWeight: tab === t ? 600 : 400,
            }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button onClick={() => apiPost('/phase2/paper/update').then(load)}
          style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 6,
            border: '1px solid #334155', background: 'transparent', color: '#94a3b8',
            cursor: 'pointer', fontSize: 11 }}>
          Mark to Market
        </button>
      </div>

      {tab === 'overview' && metrics && metrics.total_trades > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            ['Total Trades', metrics.total_trades],
            ['Win Rate', ((metrics.win_rate || 0) * 100).toFixed(1) + '%'],
            ['Profit Factor', (metrics.profit_factor || 0).toFixed(2)],
            ['Sharpe', (metrics.sharpe || 0).toFixed(3)],
            ['Sortino', (metrics.sortino || 0).toFixed(3)],
            ['Max DD', (metrics.max_drawdown || 0).toFixed(1) + '%'],
            ['Avg R', (metrics.avg_r_multiple || 0).toFixed(3)],
            ['Expectancy', fmt(metrics.expectancy)],
            ['Total P&L', fmt(metrics.total_pnl)],
            ['Best R', (metrics.best_trade_r || 0).toFixed(2)],
            ['Worst R', (metrics.worst_trade_r || 0).toFixed(2)],
            ['Avg Hold', (metrics.avg_hold_days || 0).toFixed(1) + 'd'],
          ].map(([k, v]) => (
            <div key={k} className="c" style={{ flex: '1 1 120px', minWidth: 100 }}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'overview' && (!metrics || metrics.total_trades === 0) && (
        <div className="c" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 16 }}>No closed trades yet</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Paper trades will appear here as the system runs
          </div>
        </div>
      )}

      {tab === 'positions' && (
        <div>
          {positions.length === 0 ? (
            <div className="c" style={{ textAlign: 'center', padding: 20 }}>No open positions</div>
          ) : (
            positions.map((p, i) => (
              <div key={i} className="c" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{p.symbol} <span style={{ fontSize: 11, opacity: 0.5 }}>{p.direction}</span></span>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>Grade {p.grade}</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>Entry: {fmt(p.entry_price)}</span>
                  <span>Last: {fmt(p.last_price)}</span>
                  <span>Stop: {fmt(p.current_stop)}</span>
                  <span>Shares: {p.shares}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'closed' && <ClosedTrades />}
    </div>
  )
}

function ClosedTrades() {
  const [trades, setTrades] = useState([])
  useEffect(() => {
    apiGet('/phase2/paper/positions?status=closed')
      .then(d => setTrades(d.positions || []))
      .catch(() => {})
  }, [])

  if (trades.length === 0) return <div className="c" style={{ textAlign: 'center', padding: 20 }}>No closed trades</div>

  return (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ opacity: 0.5 }}>
            <th style={{ textAlign: 'left', padding: 4 }}>Symbol</th>
            <th style={{ textAlign: 'right', padding: 4 }}>P&L</th>
            <th style={{ textAlign: 'right', padding: 4 }}>R</th>
            <th style={{ textAlign: 'left', padding: 4 }}>Exit</th>
            <th style={{ textAlign: 'left', padding: 4 }}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 50).map((t, i) => (
            <tr key={i} style={{ borderTop: '1px solid #1e293b' }}>
              <td style={{ padding: 4, fontWeight: 600 }}>{t.symbol}</td>
              <td style={{ padding: 4, textAlign: 'right',
                color: (t.net_pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                {fmt(t.net_pnl)}
              </td>
              <td style={{ padding: 4, textAlign: 'right' }}>{(t.r_multiple || 0).toFixed(2)}R</td>
              <td style={{ padding: 4, opacity: 0.6 }}>{t.exit_reason}</td>
              <td style={{ padding: 4 }}>{t.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
