import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from './api'

const fmt = (n) => '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

// Self-contained SVG P&L chart (no chart library). series = [[time, price, pnl], ...]
function PnlChart({ series }) {
  if (!series || series.length < 2)
    return <div className="chart empty">Waiting for live ticks… (chart appears once the trade is running)</div>
  const w = 640, h = 180, pad = 28
  const pnls = series.map((s) => s[2])
  const lo = Math.min(0, ...pnls), hi = Math.max(0, ...pnls)
  const span = hi - lo || 1
  const x = (i) => pad + (i / (series.length - 1)) * (w - 2 * pad)
  const y = (v) => h - pad - ((v - lo) / span) * (h - 2 * pad)
  const path = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[2]).toFixed(1)}`).join(' ')
  const last = pnls[pnls.length - 1]
  const col = last >= 0 ? '#22c55e' : '#ef4444'
  const zeroY = y(0)
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} stroke="#2a3446" strokeDasharray="4 4" />
      <path d={`${path} L${x(series.length - 1)},${zeroY} L${x(0)},${zeroY} Z`}
            fill={col} opacity="0.12" />
      <path d={path} fill="none" stroke={col} strokeWidth="2" />
      <circle cx={x(series.length - 1)} cy={y(last)} r="3.5" fill={col} />
      <text x={pad} y={14} fill="#8b97a8" fontSize="11">P&L over the session</text>
      <text x={w - pad} y={14} fill={col} fontSize="13" textAnchor="end" fontWeight="600">{fmt(last)}</text>
    </svg>
  )
}

export default function Wallet() {
  const [s, setS] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [dep, setDep] = useState('')
  const timer = useRef(null)

  // POST /wallet/tick advances the open trade AND returns status, so the chart
  // fills live while the page is open. /wallet (read-only) is the fallback.
  async function refresh() {
    try { setS(await apiPost('/wallet/tick')); setErr('') }
    catch (e) {
      try { setS(await apiGet('/wallet')); setErr('') }
      catch (e2) { setErr(e2.message) }
    }
  }
  useEffect(() => {
    refresh()
    timer.current = setInterval(refresh, 5000)   // live poll + tick every 5s
    return () => clearInterval(timer.current)
  }, [])

  async function act(fn) { setBusy(true); try { await fn(); await refresh() }
    catch (e) { setErr(e.message) } finally { setBusy(false) } }

  if (!s) return <div className="answer">{err ? 'Error: ' + err : 'Loading wallet…'}</div>

  const w = s.wallet, t = s.active_trade
  const open = t && t.status === 'open'
  const closed = t && t.status === 'closed'
  const pnlColor = (s.unrealized || (t && t.net_pnl) || 0) >= 0 ? 'ok' : 'err'

  return (
    <div>
      <div className="disc">
        ⚠ Paper money only. Disciplined, risk-managed intraday calls — <b>not a profit guarantee</b>.
        Some days lose. Technical + option-chain driven (no news feed). Not financial advice.
      </div>

      <div className="cards">
        <div className="c"><div className="k">Balance</div><div className="v">{fmt(w.balance)}</div></div>
        <div className="c"><div className="k">Live equity</div>
          <div className={'v ' + pnlColor}>{fmt(s.live_equity)}</div></div>
        <div className="c"><div className="k">Today P&L</div>
          <div className={'v ' + pnlColor}>{fmt(open ? s.unrealized : (t?.net_pnl ?? 0))}</div></div>
        <div className="c"><div className="k">Deposited</div>
          <div className="v">{fmt(w.total_deposited)} <span className="mut">/ ₹1L cap</span></div></div>
        <div className="c"><div className="k">Total realized</div>
          <div className="v">{fmt(w.realized_pnl)}</div></div>
      </div>

      {/* today's trade */}
      <div className="answer">
        {!t && <>No trade opened yet today. The system opens one automatically at ~9:25 IST.
          <div style={{ marginTop: 10 }}>
            <button disabled={busy} onClick={() => act(() => apiPost('/wallet/trade/start'))}>Take today's call now</button>
          </div></>}
        {t && t.status === 'no_trade' && <>🚫 No trade today — {t.reason}</>}
        {(open || closed) && <>
          <b>{t.symbol}</b> &nbsp;<span className="mut">{t.kind} · {t.qty} qty</span><br />
          entry {t.entry} · stop {t.stop} · target {t.target}
          {open && <span className="badge open"> LIVE</span>}
          {closed && <span className={'badge ' + (t.net_pnl >= 0 ? 'win' : 'loss')}> CLOSED · {t.exit_reason}</span>}
        </>}
      </div>

      {(open || closed) && <PnlChart series={t.pnl_series} />}

      {closed && <div className="answer"><b>Analysis</b><br />{t.analysis}</div>}

      {/* deposit */}
      <div className="box" style={{ marginTop: 16 }}>
        <input type="number" placeholder="add funds (e.g. 5000)" value={dep}
               onChange={(e) => setDep(e.target.value)} />
        <button disabled={busy || !dep} onClick={async () => {
          const r = await apiPost('/wallet/deposit', { amount: Number(dep) })
          if (r.error) setErr(r.error); else { setErr(''); setDep(''); refresh() }
        }}>Add</button>
      </div>
      {err && <div className="answer err">{err}</div>}

      {/* history */}
      {s.history?.length > 0 && <details open>
        <summary>Trade history ({s.history.length})</summary>
        <table className="hist">
          <thead><tr><th>Date</th><th>Instrument</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Reason</th><th>Net P&L</th></tr></thead>
          <tbody>{s.history.map((h, i) => (
            <tr key={i}><td>{h.date}</td><td>{h.symbol}</td><td>{h.qty}</td><td>{h.entry}</td>
              <td>{h.exit}</td><td>{h.reason}</td>
              <td className={h.net_pnl >= 0 ? 'ok' : 'err'}>{fmt(h.net_pnl)}</td></tr>))}
          </tbody>
        </table>
      </details>}

      <div className="meta" style={{ marginTop: 10 }}>auto-refreshing every 5s</div>
    </div>
  )
}
