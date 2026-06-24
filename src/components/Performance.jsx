import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (n) => n == null ? '-' : n.toFixed(1) + '%'

function EquityCurveChart({ data }) {
  if (!data || data.length < 2) return null
  const w = 600, h = 180, pad = 40
  const vals = data.map(d => d.cumulative)
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals)
  const span = hi - lo || 1
  const xp = (i) => pad + (i / (data.length - 1)) * (w - 2 * pad)
  const yp = (v) => h - pad - ((v - lo) / span) * (h - 2 * pad)
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${xp(i).toFixed(1)},${yp(d.cumulative).toFixed(1)}`).join(' ')
  const last = vals[vals.length - 1]
  const col = last >= 0 ? '#22c55e' : '#ef4444'

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ height: 180 }}>
      <line x1={pad} x2={w - pad} y1={yp(0)} y2={yp(0)} stroke="#2a3446" strokeDasharray="4 4" />
      <path d={`${path} L${xp(data.length - 1)},${yp(0)} L${xp(0)},${yp(0)} Z`} fill={col} opacity="0.1" />
      <path d={path} fill="none" stroke={col} strokeWidth="2" />
      <circle cx={xp(data.length - 1)} cy={yp(last)} r="3" fill={col} />
      <text x={w - pad} y={14} fill={col} fontSize="12" textAnchor="end" fontWeight="600">{fmt(last)}</text>
      <text x={pad} y={h - 8} fill="#8b97a8" fontSize="10">{data[0]?.date}</text>
      <text x={w - pad} y={h - 8} fill="#8b97a8" fontSize="10" textAnchor="end">{data[data.length - 1]?.date}</text>
    </svg>
  )
}

function DailyPnlBars({ data }) {
  if (!data || data.length < 2) return null
  const w = 600, h = 120, pad = 40
  const vals = data.map(d => d.daily_pnl)
  const maxAbs = Math.max(1, ...vals.map(Math.abs))
  const barW = Math.max(3, (w - 2 * pad) / data.length - 1)
  const mid = h / 2

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ height: 120 }}>
      <line x1={pad} x2={w - pad} y1={mid} y2={mid} stroke="#2a3446" strokeDasharray="4 4" />
      {data.map((d, i) => {
        const x = pad + (i / data.length) * (w - 2 * pad)
        const barH = Math.abs(d.daily_pnl) / maxAbs * (h / 2 - 10)
        const col = d.daily_pnl >= 0 ? '#22c55e' : '#ef4444'
        const y = d.daily_pnl >= 0 ? mid - barH : mid
        return <rect key={i} x={x} y={y} width={barW} height={barH} fill={col} opacity="0.7" rx="1" />
      })}
    </svg>
  )
}

export default function Performance() {
  const [perf, setPerf] = useState(null)
  const [curve, setCurve] = useState(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState(null)

  const load = useCallback(async () => {
    try {
      const [p, c, m] = await Promise.all([
        apiGet(`/portfolio/performance?days=${days}`),
        apiGet(`/portfolio/equity-curve?days=${days * 3}`),
        apiGet('/portfolio/models').catch(() => null),
      ])
      setPerf(p)
      setCurve(c?.curve || [])
      if (m) setModels(m)
    } catch { /* keep last */ }
    finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  async function takeSnapshot() {
    try { await apiPost('/portfolio/snapshot'); load() }
    catch (e) { alert(e.message) }
  }

  if (loading) return <div className="mut">Loading performance data...</div>

  return (
    <div>
      <h2>Performance</h2>
      <div className="crumb">
        Portfolio analytics, attribution, and equity tracking
        <button className="mini" style={{ marginLeft: 12 }} onClick={takeSnapshot}>Take Snapshot</button>
      </div>

      {/* Period selector */}
      <div className="row" style={{ marginBottom: 16 }}>
        {[7, 30, 60, 90].map(d => (
          <button key={d} className={'tab' + (days === d ? ' on' : '')} onClick={() => setDays(d)}>{d}d</button>
        ))}
      </div>

      {/* Summary Cards */}
      {perf && !perf.message && (
        <>
          <div className="cards">
            <div className="c">
              <div className="k">Total P&L ({days}d)</div>
              <div className={'v ' + ((perf.total_pnl || 0) >= 0 ? 'ok' : 'err')}>{fmt(perf.total_pnl)}</div>
            </div>
            <div className="c">
              <div className="k">Win Rate</div>
              <div className={'v ' + ((perf.win_rate || 0) >= 60 ? 'ok' : 'err')}>{pct(perf.win_rate)}</div>
            </div>
            <div className="c">
              <div className="k">Total Trades</div>
              <div className="v">{perf.total_trades}</div>
            </div>
            <div className="c">
              <div className="k">All-Time P&L</div>
              <div className={'v ' + ((perf.all_time?.total_pnl || 0) >= 0 ? 'ok' : 'err')}>
                {fmt(perf.all_time?.total_pnl)}
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {perf.equity_curve && perf.equity_curve.length > 1 && (
            <div className="panel">
              <h3>Equity Curve</h3>
              <EquityCurveChart data={perf.equity_curve} />
            </div>
          )}

          {/* Snapshot Equity Curve */}
          {curve && curve.length > 1 && (
            <div className="panel">
              <h3>Portfolio Equity (from snapshots)</h3>
              <EquityCurveChart data={curve.map(c => ({ ...c, cumulative: c.cumulative_pnl }))} />
              <DailyPnlBars data={curve.map(c => ({ daily_pnl: c.day_pnl }))} />
            </div>
          )}

          {/* By Segment */}
          {perf.by_segment && Object.keys(perf.by_segment).length > 0 && (
            <div className="panel">
              <h3>Performance by Segment</h3>
              <table className="hist">
                <thead>
                  <tr><th>Segment</th><th>Trades</th><th>Win Rate</th><th>P&L</th><th>Avg P&L</th><th>Profit Factor</th></tr>
                </thead>
                <tbody>
                  {Object.entries(perf.by_segment).map(([seg, s]) => (
                    <tr key={seg}>
                      <td><span className={'seg-label ' + seg}>{seg}</span></td>
                      <td>{s.trades}</td>
                      <td className={(s.win_rate || 0) >= 60 ? 'ok' : 'err'}>{pct(s.win_rate)}</td>
                      <td className={(s.pnl || 0) >= 0 ? 'ok' : 'err'}>{fmt(s.pnl)}</td>
                      <td className={(s.avg_pnl || 0) >= 0 ? 'ok' : 'err'}>{fmt(s.avg_pnl)}</td>
                      <td>{s.profit_factor}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Winners / Losers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {perf.top_winners && perf.top_winners.length > 0 && (
              <div className="panel" style={{ marginTop: 0 }}>
                <h3 style={{ color: 'var(--good)' }}>Top Winners</h3>
                {perf.top_winners.map((w, i) => (
                  <div key={i} className="histrow">
                    <div className="hr-top">
                      <b>{w.symbol}</b>
                      <span className="ok">{fmt(w.pnl)}</span>
                    </div>
                    <div className="mut">{w.trades} trade{w.trades > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
            {perf.top_losers && perf.top_losers.length > 0 && (
              <div className="panel" style={{ marginTop: 0 }}>
                <h3 style={{ color: 'var(--bad)' }}>Top Losers</h3>
                {perf.top_losers.map((l, i) => (
                  <div key={i} className="histrow">
                    <div className="hr-top">
                      <b>{l.symbol}</b>
                      <span className="err">{fmt(l.pnl)}</span>
                    </div>
                    <div className="mut">{l.trades} trade{l.trades > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {perf?.message && <div className="panel"><div className="mut">{perf.message}</div></div>}

      {/* ML Models Status */}
      {models && (
        <div className="panel">
          <h3>ML Models</h3>
          <div className="models-grid">
            {Object.entries(models.models || {}).map(([name, info]) => (
              <div key={name} className="model-card">
                <div className="model-name">{name.replace(/_/g, ' ')}</div>
                <div className={'model-status ' + (info.status === 'active' ? 'ok' : 'err')}>{info.status}</div>
                {info.backtest_win_rate && (
                  <div className="model-detail">
                    {Object.entries(info.backtest_win_rate).map(([k, v]) => (
                      <span key={k}>{k}: {v}%</span>
                    ))}
                  </div>
                )}
                {info.win_rate && <div className="model-detail">Win: {info.win_rate}%</div>}
                {info.rank_ic && <div className="model-detail">IC: {info.rank_ic.toFixed(4)}</div>}
                {info.edge && <div className={'model-edge ' + info.edge.toLowerCase()}>{info.edge}</div>}
              </div>
            ))}
          </div>
          {models.data && Object.keys(models.data).length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--mut)' }}>
              Data: {Object.entries(models.data).map(([sym, d]) =>
                `${sym} ${d.days} days (${d.first} to ${d.last})`
              ).join(' | ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
