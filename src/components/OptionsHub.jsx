import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const GRADE_COLORS = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#f59e0b', 'C': '#f97316' }

export default function OptionsHub({ onExplain }) {
  const [picks, setPicks] = useState([])
  const [graded, setGraded] = useState([])
  const [best, setBest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [positions, setPositions] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reco, wallet, p2] = await Promise.all([
        apiGet('/recommendations'),
        apiGet('/me/wallet'),
        apiGet('/phase2/recommendations').catch(() => null),
      ])
      setPicks(reco?.options || [])
      setBest(reco?.best_per_segment?.options || null)
      setPositions((wallet?.open_trades || []).filter(t => t.segment === 'options'))

      if (p2?.recommendations) {
        const optRecs = p2.recommendations.filter(r =>
          r.strategy === 'buy_call' || r.strategy === 'buy_put' ||
          r.strategy === 'bull_call_spread' || r.strategy === 'bear_put_spread' ||
          r.strategy === 'iron_condor' || r.strategy === 'straddle' ||
          (r.symbol && (r.symbol.includes('NIFTY') || r.symbol.includes('BANKNIFTY')))
        )
        setGraded(optRecs)
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function trade(underlying, leg) {
    setMsg('Placing...')
    try {
      const r = await apiPost('/me/trade', { segment: 'options', underlying, leg })
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty} (SL ${fmt(t.stop)} · TGT ${fmt(t.target)})`)
      load()
    } catch (e) { setMsg(e.message) }
  }

  async function tradeFromPick(pick) {
    setMsg('Placing...')
    try {
      const spec = pick.spec || {
        segment: 'options',
        underlying: pick.symbol?.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY',
        leg: pick.action === 'buy' ? 'CE' : 'PE',
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
      <h2>Options</h2>
      <div className="crumb">NIFTY & BANKNIFTY — best picks from ML pipeline with grading</div>

      {/* Quick trade buttons */}
      <div className="c" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Quick Trade</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>NIFTY</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="trade-btn buy" onClick={() => trade('NIFTY', 'CE')}
                style={{ flex: 1 }}>Buy CE</button>
              <button className="trade-btn sell" onClick={() => trade('NIFTY', 'PE')}
                style={{ flex: 1 }}>Buy PE</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>BANKNIFTY</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="trade-btn buy" onClick={() => trade('BANKNIFTY', 'CE')}
                style={{ flex: 1 }}>Buy CE</button>
              <button className="trade-btn sell" onClick={() => trade('BANKNIFTY', 'PE')}
                style={{ flex: 1 }}>Buy PE</button>
            </div>
          </div>
        </div>
        {msg && <div className="crumb" style={{ marginTop: 8 }}>{msg}</div>}
      </div>

      {/* Best option pick from Phase 1 */}
      {best && (
        <div className="c" style={{ marginBottom: 16, borderLeft: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Best Pick</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{best.symbol}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={`seg-conf-val ${best.confidence >= 70 ? 'high' : best.confidence >= 45 ? 'mid' : 'low'}`}>
                {best.confidence}%
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>confidence</div>
            </div>
          </div>
          <div style={{ fontSize: 12, marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Entry <b>{fmt(best.entry)}</b></span>
            <span>SL <b>{fmt(best.stop)}</b></span>
            <span>TGT <b>{fmt(best.target)}</b></span>
            <span>R:R <b>{best.reward_risk}:1</b></span>
            {best.grade && <span>Grade <b>{best.grade}</b></span>}
          </div>
          {best.reason && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{best.reason}</div>}
          <button className="take-trade-btn" onClick={() => tradeFromPick(best)}
            style={{ marginTop: 8 }}>Execute This Trade</button>
        </div>
      )}

      {/* Graded recommendations from Phase 2 */}
      {graded.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Intelligence-Graded Options ({graded.length})</h3>
          {graded.map((rec, i) => {
            const gc = GRADE_COLORS[rec.grade] || '#9ca3af'
            return (
              <div key={i} className="c" style={{ marginBottom: 8, borderLeft: `3px solid ${gc}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{rec.symbol}</span>
                    <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 6px', borderRadius: 4,
                      background: gc + '22', color: gc, fontWeight: 600 }}>{rec.grade}</span>
                  </div>
                  <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>
                    {rec.strategy?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                  <span><span style={{ opacity: 0.5 }}>Score</span> {rec.composite_score?.toFixed(0)}</span>
                  <span><span style={{ opacity: 0.5 }}>Conviction</span> {rec.conviction?.toFixed(0)}</span>
                  <span><span style={{ opacity: 0.5 }}>Quality</span> {rec.trade_quality?.toFixed(0)}</span>
                </div>
                {rec.signal && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    Entry: {rec.signal.entry} · SL: {rec.signal.stop_loss} · Target: {rec.signal.target}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="take-trade-btn" onClick={() => tradeFromPick(rec)}>
                    Execute
                  </button>
                  <button onClick={() => onExplain && onExplain(rec)} style={{
                    background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
                    padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                  }}>Why?</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All options picks from Phase 1 */}
      {picks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>All Option Picks ({picks.length})</h3>
          {picks.map((p, i) => {
            const confCls = p.confidence >= 70 ? 'high' : p.confidence >= 45 ? 'mid' : 'low'
            return (
              <div key={i} className="c" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.symbol}</span>
                    <span className={`seg-action ${p.action}`} style={{ marginLeft: 8 }}>{p.action}</span>
                  </div>
                  <div className={`seg-conf-val ${confCls}`}>{p.confidence}%</div>
                </div>
                <div style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                  <span>Entry <b>{fmt(p.entry)}</b></span>
                  <span>SL <b>{fmt(p.stop)}</b></span>
                  <span>TGT <b>{fmt(p.target)}</b></span>
                  <span>R:R <b>{p.reward_risk}:1</b></span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="take-trade-btn" onClick={() => tradeFromPick(p)}>Execute</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && picks.length === 0 && graded.length === 0 && !best && (
        <div className="c" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 16 }}>No option picks right now</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Use quick trade buttons above or wait for ML signals
          </div>
        </div>
      )}

      {loading && <div className="mut">Scanning NIFTY & BANKNIFTY options...</div>}

      {/* Open positions */}
      {positions.length > 0 && (
        <div className="c" style={{ marginTop: 16 }}>
          <div className="k">Open Option Positions ({positions.length})</div>
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
