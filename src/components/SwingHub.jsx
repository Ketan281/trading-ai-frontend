import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const GRADE_COLORS = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#f59e0b', 'C': '#f97316' }

export default function SwingHub({ onExplain }) {
  const [picks, setPicks] = useState([])
  const [best, setBest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [positions, setPositions] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reco, wallet] = await Promise.all([
        apiGet('/recommendations'),
        apiGet('/me/wallet'),
      ])
      setPicks(reco?.swing || [])
      setBest(reco?.best_per_segment?.swing || null)
      setPositions((wallet?.open_trades || []).filter(t => t.segment === 'swing'))
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function tradePick(pick) {
    setMsg('Placing...')
    try {
      const spec = pick.spec || {
        segment: 'equity',
        symbol: pick.symbol,
        side: pick.action === 'sell' ? 'short' : 'long',
      }
      const r = await apiPost('/me/trade', spec)
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty}`)
      load()
    } catch (e) { setMsg(e.message) }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Swing Trades</h2>
      <div className="crumb">Multi-day positional picks — hold 2-10 days based on ML signals</div>

      {msg && <div className="crumb" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* Best swing pick */}
      {best && (
        <div className="c" style={{ marginBottom: 16, borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Best Swing Pick</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{best.symbol}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={`seg-conf-val ${best.confidence >= 70 ? 'high' : best.confidence >= 45 ? 'mid' : 'low'}`}>
                {best.confidence}%
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>confidence</div>
            </div>
          </div>
          <div style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Entry <b>{fmt(best.entry)}</b></span>
            <span>SL <b>{fmt(best.stop)}</b></span>
            <span>TGT <b>{fmt(best.target)}</b></span>
            <span>R:R <b>{best.reward_risk}:1</b></span>
            {best.grade && <span>Grade <b>{best.grade}</b></span>}
          </div>
          {best.reason && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{best.reason}</div>}
          <button className="take-trade-btn" style={{ marginTop: 8 }} onClick={() => tradePick(best)}>
            Execute This Trade
          </button>
        </div>
      )}

      {/* All swing picks */}
      {picks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Swing Recommendations ({picks.length})</h3>
          {picks.map((p, i) => {
            const confCls = p.confidence >= 70 ? 'high' : p.confidence >= 45 ? 'mid' : 'low'
            return (
              <div key={i} className="c" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.symbol}</span>
                    <span className={`seg-action ${p.action}`} style={{ marginLeft: 8 }}>{p.action}</span>
                    {p.grade && (
                      <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 6px', borderRadius: 4,
                        background: (GRADE_COLORS[p.grade] || '#9ca3af') + '22',
                        color: GRADE_COLORS[p.grade] || '#9ca3af', fontWeight: 600 }}>{p.grade}</span>
                    )}
                  </div>
                  <div className={`seg-conf-val ${confCls}`}>{p.confidence}%</div>
                </div>
                <div style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                  <span>Entry <b>{fmt(p.entry)}</b></span>
                  <span>SL <b>{fmt(p.stop)}</b></span>
                  <span>TGT <b>{fmt(p.target)}</b></span>
                  <span>R:R <b>{p.reward_risk}:1</b></span>
                </div>
                {p.reason && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{p.reason}</div>}
                <button className="take-trade-btn" style={{ marginTop: 6 }} onClick={() => tradePick(p)}>
                  Execute
                </button>
              </div>
            )
          })}
        </div>
      )}

      {loading && <div className="mut">Scanning for swing setups...</div>}

      {!loading && picks.length === 0 && !best && (
        <div className="c" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 16 }}>No swing picks right now</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Swing setups require multi-day confluence — check back after market hours
          </div>
        </div>
      )}

      {/* Open swing positions */}
      {positions.length > 0 && (
        <div className="c" style={{ marginTop: 16 }}>
          <div className="k">Open Swing Positions ({positions.length})</div>
          {positions.map((t, i) => (
            <div key={i} style={{ fontSize: 12, padding: '6px 0', borderTop: i ? '1px solid #1e293b' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>{t.symbol}</b> <span style={{ opacity: 0.5 }}>{t.side} x{t.qty}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span>Entry {fmt(t.entry)}</span>
                <button className="mini" onClick={async () => {
                  await apiPost(`/me/trade/${t.id}/close`); load()
                }}>Square off</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
