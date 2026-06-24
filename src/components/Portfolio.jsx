import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, getToken, API } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (n) => n == null ? '-' : n.toFixed(1) + '%'

const STATE_COLORS = { normal: '#22c55e', caution: '#f59e0b', restricted: '#f97316', halt: '#ef4444' }

function useLiveStream() {
  const [snapshot, setSnapshot] = useState(null)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  useEffect(() => {
    function connect() {
      const tok = getToken()
      if (!tok) return
      const proto = API.startsWith('https') ? 'wss' : 'ws'
      const host = API.replace(/^https?:\/\//, '')
      const url = `${proto}://${host}/ws/live?token=${encodeURIComponent(tok)}`
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onmessage = (e) => { try { setSnapshot(JSON.parse(e.data)) } catch {} }
      ws.onclose = () => { reconnectRef.current = setTimeout(connect, 5000) }
      ws.onerror = () => { ws.close() }
    }
    connect()
    return () => { clearTimeout(reconnectRef.current); wsRef.current?.close() }
  }, [])
  return snapshot
}

function PnlMiniChart({ series }) {
  if (!series || series.length < 2) return null
  const w = 500, h = 80, pad = 20
  const pnls = series.map(s => s[2])
  const lo = Math.min(0, ...pnls), hi = Math.max(0, ...pnls)
  const span = hi - lo || 1
  const xp = (i) => pad + (i / (series.length - 1)) * (w - 2 * pad)
  const yp = (v) => h - pad - ((v - lo) / span) * (h - 2 * pad)
  const path = series.map((s, i) => `${i ? 'L' : 'M'}${xp(i).toFixed(1)},${yp(s[2]).toFixed(1)}`).join(' ')
  const last = pnls[pnls.length - 1]
  const col = last >= 0 ? '#22c55e' : '#ef4444'
  return <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ height: 80, marginTop: 4 }}>
    <line x1={pad} x2={w - pad} y1={yp(0)} y2={yp(0)} stroke="#2a3446" strokeDasharray="4 4" />
    <path d={`${path} L${xp(series.length - 1)},${yp(0)} L${xp(0)},${yp(0)} Z`} fill={col} opacity="0.12" />
    <path d={path} fill="none" stroke={col} strokeWidth="2" />
    <circle cx={xp(series.length - 1)} cy={yp(last)} r="3" fill={col} />
    <text x={w - pad} y={14} fill={col} fontSize="12" textAnchor="end" fontWeight="600">{fmt(last)}</text>
  </svg>
}

function EquityCurveChart({ data }) {
  if (!data || data.length < 2) return null
  const w = 600, h = 160, pad = 40
  const vals = data.map(d => d.cumulative ?? d.cumulative_pnl ?? 0)
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals)
  const span = hi - lo || 1
  const xp = (i) => pad + (i / (data.length - 1)) * (w - 2 * pad)
  const yp = (v) => h - pad - ((v - lo) / span) * (h - 2 * pad)
  const path = data.map((d, i) => {
    const v = d.cumulative ?? d.cumulative_pnl ?? 0
    return `${i ? 'L' : 'M'}${xp(i).toFixed(1)},${yp(v).toFixed(1)}`
  }).join(' ')
  const last = vals[vals.length - 1]
  const col = last >= 0 ? '#22c55e' : '#ef4444'
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ height: 160 }}>
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

export default function Portfolio() {
  const [wallet, setWallet] = useState(null)
  const [psych, setPsych] = useState(null)
  const [allocation, setAllocation] = useState(null)
  const [allocBalance, setAllocBalance] = useState(0)
  const [indianMode, setIndianMode] = useState('custom')
  const [toggling, setToggling] = useState(false)
  const [autoOpened, setAutoOpened] = useState(null)
  const [dep, setDep] = useState('')
  const [positions, setPositions] = useState([])
  const [perf, setPerf] = useState(null)
  const [curve, setCurve] = useState(null)
  const [days, setDays] = useState(30)
  const [models, setModels] = useState(null)
  const live = useLiveStream()

  const load = useCallback(async () => {
    try {
      const [w, alloc, p, pf, cv, m] = await Promise.all([
        apiGet('/me/wallet'),
        apiGet('/recommendations/allocate').catch(() => null),
        apiGet('/phase2/psychology').catch(() => null),
        apiGet(`/portfolio/performance?days=${days}`).catch(() => null),
        apiGet(`/portfolio/equity-curve?days=${days * 3}`).catch(() => null),
        apiGet('/portfolio/models').catch(() => null),
      ])
      setWallet(w)
      setPositions((w?.open_trades || []).filter(t => t.segment !== 'forex'))
      if (w?.indian_trade_mode) setIndianMode(w.indian_trade_mode)
      if (alloc) { setAllocation(alloc.allocation); setAllocBalance(alloc.balance) }
      if (p) setPsych(p)
      setPerf(pf)
      setCurve(cv?.curve || [])
      if (m) setModels(m)
    } catch {}
  }, [days])

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  async function toggleMode(mode) {
    setToggling(true); setAutoOpened(null)
    try {
      const r = await apiPost('/me/mode/indian', { mode })
      if (r.auto_opened) setAutoOpened(r.auto_opened)
      setIndianMode(mode); load()
    } catch (e) { alert(e.message) } finally { setToggling(false) }
  }

  const riskState = psych?.risk_state || psych?.state?.risk_state || 'normal'
  const riskColor = STATE_COLORS[riskState] || '#9ca3af'
  const psychScore = psych?.state?.psychology_score ?? 100
  const disciplineScore = psych?.state?.discipline_score ?? 100
  const segs = ['equity_intraday', 'options', 'swing']
  const segLabels = { equity_intraday: 'Equity', options: 'Options', swing: 'Swing' }

  return (
    <div style={{ padding: 16 }}>
      <h2>Positions & Capital</h2>

      {/* Trading mode toggle */}
      <div className="c" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Trading Mode</div>
        <div className="mode-switch">
          <button className={'mode-btn' + (indianMode !== 'ml' ? ' active' : '')}
            disabled={toggling} onClick={() => toggleMode('custom')}>
            Custom <span className="mode-desc">Manual trading</span>
          </button>
          <button className={'mode-btn ml' + (indianMode === 'ml' ? ' active' : '')}
            disabled={toggling} onClick={() => toggleMode('ml')}>
            ML Auto <span className="mode-desc">System picks & manages</span>
          </button>
        </div>
        {indianMode === 'ml' && <div className="mode-info" style={{ marginTop: 8 }}>
          Auto-trades Indian market during 9:15-15:15 IST. Picks best option/future, manages SL & target.
        </div>}
        {autoOpened && autoOpened.length > 0 && <div style={{ marginTop: 8 }}>
          {autoOpened.map((a, i) => <div key={i} className={'auto-msg ' + (a.error ? 'err' : a.trade ? 'ok' : '')}>
            {a.trade ? `Opened ${a.symbol} (${a.trade.side})` :
             a.error ? `Error: ${a.error}` : a.info || 'No trade available'}
          </div>)}
        </div>}
      </div>

      {/* Wallet + Psychology */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="c" style={{ flex: 2, minWidth: 250 }}>
          <div className="k">Capital</div>
          {wallet ? (
            <>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>Balance</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(wallet.balance)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>Realized P&L</div>
                  <div style={{ fontSize: 20, fontWeight: 700,
                    color: (wallet.realized_pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmt(wallet.realized_pnl)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <input type="number" placeholder="Add paper funds (max 1,00,000)" value={dep}
                  onChange={(e) => setDep(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                <button className="mini" disabled={!dep} onClick={async () => {
                  await apiPost('/me/wallet/deposit', { amount: Number(dep) })
                  setDep(''); load()
                }}>Add</button>
              </div>
            </>
          ) : <div className="mut">Loading...</div>}
        </div>
        <div className="c" style={{ flex: 1, minWidth: 200 }}>
          <div className="k">Risk State</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: riskColor, display: 'inline-block' }} />
              <span style={{ color: riskColor, fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>
                {riskState}
              </span>
            </div>
            <div style={{ fontSize: 12, display: 'flex', gap: 16 }}>
              <span><span style={{ opacity: 0.5 }}>Psychology</span> {psychScore}/100</span>
              <span><span style={{ opacity: 0.5 }}>Discipline</span> {disciplineScore}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve */}
      {curve && curve.length > 1 && (
        <div className="panel">
          <h3>Equity Curve</h3>
          <EquityCurveChart data={curve.map(c => ({ ...c, cumulative: c.cumulative_pnl ?? c.cumulative ?? 0 }))} />
        </div>
      )}
      {perf?.equity_curve && perf.equity_curve.length > 1 && (!curve || curve.length < 2) && (
        <div className="panel">
          <h3>Equity Curve</h3>
          <EquityCurveChart data={perf.equity_curve} />
        </div>
      )}

      {/* Performance metrics */}
      {perf && !perf.message && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Performance</h3>
            <div className="row" style={{ gap: 4 }}>
              {[7, 30, 60, 90].map(d => (
                <button key={d} className={'tab' + (days === d ? ' on' : '')} onClick={() => setDays(d)}>{d}d</button>
              ))}
            </div>
          </div>
          <div className="cards" style={{ marginTop: 0 }}>
            <div className="c">
              <div className="k">Total P&L</div>
              <div className={'v ' + ((perf.total_pnl || 0) >= 0 ? 'ok' : 'err')}>{fmt(perf.total_pnl)}</div>
            </div>
            <div className="c">
              <div className="k">Win Rate</div>
              <div className={'v ' + ((perf.win_rate || 0) >= 60 ? 'ok' : 'err')}>{pct(perf.win_rate)}</div>
            </div>
            <div className="c">
              <div className="k">Trades</div>
              <div className="v">{perf.total_trades}</div>
            </div>
            <div className="c">
              <div className="k">All-Time P&L</div>
              <div className={'v ' + ((perf.all_time?.total_pnl || 0) >= 0 ? 'ok' : 'err')}>
                {fmt(perf.all_time?.total_pnl)}
              </div>
            </div>
          </div>

          {perf.by_segment && Object.keys(perf.by_segment).length > 0 && (
            <table className="hist" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Segment</th><th>Trades</th><th>Win Rate</th><th>P&L</th><th>PF</th></tr>
              </thead>
              <tbody>
                {Object.entries(perf.by_segment).map(([seg, s]) => (
                  <tr key={seg}>
                    <td><span className={'seg-label ' + seg}>{seg}</span></td>
                    <td>{s.trades}</td>
                    <td className={(s.win_rate || 0) >= 60 ? 'ok' : 'err'}>{pct(s.win_rate)}</td>
                    <td className={(s.pnl || 0) >= 0 ? 'ok' : 'err'}>{fmt(s.pnl)}</td>
                    <td>{s.profit_factor}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Capital allocation */}
      {allocation && (
        <div className="c" style={{ marginBottom: 16 }}>
          <div className="k">Capital Allocation</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
            {fmt(allocBalance)} divided by confidence across segments
          </div>
          {(() => {
            const active = segs.filter(s => allocation[s]?.allocation_pct > 0)
            if (!active.length) return <div className="mut">No allocations — no confident picks available.</div>
            return <>
              <div className="alloc-bar">
                {active.map(s => <div key={s} className={`alloc-seg ${s}`}
                  style={{ flex: allocation[s].allocation_pct }}>
                  {allocation[s].allocation_pct >= 10 ? `${allocation[s].allocation_pct}%` : ''}
                </div>)}
              </div>
              <div className="alloc-legend" style={{ marginTop: 8 }}>
                {active.map(s => <span key={s}>
                  <span className={`alloc-dot ${s}`} />
                  {segLabels[s]}: {fmt(allocation[s].amount)} ({allocation[s].allocation_pct}%)
                </span>)}
              </div>
            </>
          })()}
        </div>
      )}

      {/* Live equity from WebSocket */}
      {live && (
        <div className="cards" style={{ marginBottom: 16 }}>
          <div className="c">
            <div className="k">Live Equity</div>
            <div className="v">{fmt(live.live_equity)}</div>
          </div>
          <div className="c">
            <div className="k">Unrealized P&L</div>
            <div className={'v ' + ((live.unrealized || 0) >= 0 ? 'ok' : 'err')}>
              {fmt(live.unrealized)}
            </div>
          </div>
        </div>
      )}

      {/* Open positions with real-time P&L charts */}
      <div className="c">
        <div className="k">Open Positions ({positions.length})</div>
        {positions.length === 0 ? (
          <div className="mut" style={{ marginTop: 8 }}>No open positions.</div>
        ) : (<>
          <table className="hist" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Instrument</th><th>Qty</th><th>Entry</th><th>LTP</th><th>SL / Tgt</th><th>P&L</th><th></th></tr>
            </thead>
            <tbody>{positions.map((t) => {
              const last = t.pnl_series?.length ? t.pnl_series[t.pnl_series.length - 1] : null
              const ltp = last ? last[1] : t.entry
              const pnl = last ? last[2] : 0
              return <tr key={t.id}>
                <td>{t.symbol}<div className="mut">{t.segment} · {t.side}</div></td>
                <td>{t.qty}</td><td>{fmt(t.entry)}</td>
                <td>{fmt(ltp)}</td>
                <td>{fmt(t.stop)} / {fmt(t.target)}</td>
                <td className={pnl >= 0 ? 'ok' : 'err'}>{fmt(pnl)}</td>
                <td><button className="mini" onClick={async () => {
                  await apiPost(`/me/trade/${t.id}/close`); load()
                }}>Square off</button></td>
              </tr>
            })}</tbody>
          </table>
          {positions.map(t => t.pnl_series?.length > 1 && (
            <div key={t.id + '-chart'} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>{t.symbol} P&L</div>
              <PnlMiniChart series={t.pnl_series} />
            </div>
          ))}
        </>)}
      </div>

      {/* ML Models */}
      {models && (
        <div className="panel" style={{ marginTop: 16 }}>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
