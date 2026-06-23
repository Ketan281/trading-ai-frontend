import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const GRADE_COLORS = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#f59e0b', 'C': '#f97316' }

export default function EquityHub({ onExplain }) {
  const [picks, setPicks] = useState([])
  const [graded, setGraded] = useState([])
  const [best, setBest] = useState(null)
  const [eqReco, setEqReco] = useState(null)
  const [screenerPicks, setScreenerPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [sym, setSym] = useState('RELIANCE')
  const [qty, setQty] = useState('')
  const [msg, setMsg] = useState('')
  const [positions, setPositions] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reco, eqR, wallet, p2] = await Promise.all([
        apiGet('/recommendations'),
        apiGet('/equity/recommendation').catch(() => null),
        apiGet('/me/wallet'),
        apiGet('/phase2/recommendations').catch(() => null),
      ])
      setPicks(reco?.equity_intraday || [])
      setBest(reco?.best_per_segment?.equity_intraday || null)
      setPositions((wallet?.open_trades || []).filter(t =>
        t.segment === 'equity' || t.segment === 'equity_intraday'))

      if (eqR) {
        setEqReco(eqR.recommendation || null)
        setScreenerPicks(eqR.screener_picks || [])
      }

      if (p2?.recommendations) {
        const eqRecs = p2.recommendations.filter(r =>
          r.strategy === 'equity_long' || r.strategy === 'equity_short' ||
          (!r.strategy?.includes('call') && !r.strategy?.includes('put') &&
           !r.strategy?.includes('spread') && !r.strategy?.includes('condor') &&
           !r.strategy?.includes('straddle') &&
           !r.symbol?.includes('NIFTY') && !r.symbol?.includes('BANKNIFTY'))
        )
        setGraded(eqRecs)
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function trade(side, symbol, quantity) {
    const spec = { segment: 'equity', symbol: (symbol || sym).toUpperCase().trim(), side }
    if (quantity || qty) spec.qty = Number(quantity || qty)
    setMsg('Placing...')
    try {
      const r = await apiPost('/me/trade', spec)
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty}`)
      load()
    } catch (e) { setMsg(e.message) }
  }

  async function takeReco() {
    const spec = eqReco?.spec
    if (!spec) return
    setMsg('Placing recommended trade...')
    try {
      const r = await apiPost('/me/trade', spec)
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty}`)
      load()
    } catch (e) { setMsg(e.message) }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Intraday Equity</h2>
      <div className="crumb">ML-graded cash-segment picks with action buttons</div>

      {msg && <div className="crumb" style={{ marginBottom: 8 }}>{msg}</div>}

      {/* Best ML recommendation */}
      {eqReco && (
        <div className="c" style={{ marginBottom: 16, borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: 11, opacity: 0.5 }}>ML Best Pick</div>
          <div className="answer" style={{ margin: '4px 0' }}>{eqReco.answer}</div>
          {eqReco.spec && <button className="take-trade-btn" onClick={takeReco}>Execute This Trade</button>}
        </div>
      )}

      {/* Best from segment recommendations */}
      {best && (
        <div className="c" style={{ marginBottom: 16, borderLeft: '3px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Top Ranked</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{best.symbol}</div>
            </div>
            <div className={`seg-conf-val ${best.confidence >= 70 ? 'high' : best.confidence >= 45 ? 'mid' : 'low'}`}>
              {best.confidence}%
            </div>
          </div>
          <div style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Entry <b>{fmt(best.entry)}</b></span>
            <span>SL <b>{fmt(best.stop)}</b></span>
            <span>TGT <b>{fmt(best.target)}</b></span>
            <span>R:R <b>{best.reward_risk}:1</b></span>
          </div>
          {best.reason && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{best.reason}</div>}
          <button className="take-trade-btn" style={{ marginTop: 8 }}
            onClick={() => trade(best.action === 'sell' ? 'short' : 'long', best.symbol)}>
            Execute This Trade
          </button>
        </div>
      )}

      {/* Screener picks */}
      {screenerPicks.length > 0 && (
        <div className="c" style={{ marginBottom: 16 }}>
          <div className="k">Screener Picks</div>
          <div className="picks-grid" style={{ marginTop: 8 }}>
            {screenerPicks.map((p, i) => (
              <div key={i} className="pick-card" style={{ cursor: 'pointer' }}
                onClick={() => setSym(p.symbol || p.ticker || '')}>
                <b>{p.symbol || p.ticker}</b>
                {p.score != null && <span className="pick-score">{p.score?.toFixed?.(1) ?? p.score}</span>}
                {p.reason && <div className="mut">{p.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graded recommendations from Phase 2 */}
      {graded.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Intelligence-Graded Equity ({graded.length})</h3>
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
                  <span style={{ color: rec.action === 'buy' ? '#22c55e' : '#ef4444',
                    fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>
                    {rec.action}
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
                {rec.position_size && rec.position_size.shares > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    Size: {rec.position_size.shares} shares · {fmt(rec.position_size.capital_allocated)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="take-trade-btn"
                    onClick={() => trade(rec.action === 'sell' ? 'short' : 'long', rec.symbol,
                      rec.position_size?.shares)}>
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

      {/* All equity picks from Phase 1 */}
      {picks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>All Equity Picks ({picks.length})</h3>
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
                <button className="take-trade-btn" style={{ marginTop: 6 }}
                  onClick={() => trade(p.action === 'sell' ? 'short' : 'long', p.symbol)}>
                  Execute
                </button>
              </div>
            )
          })}
        </div>
      )}

      {loading && <div className="mut">Scanning equity markets...</div>}

      {!loading && picks.length === 0 && graded.length === 0 && !best && !eqReco && (
        <div className="c" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 16 }}>No equity picks right now</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Use manual trade above or wait for ML signals
          </div>
        </div>
      )}

      {/* Open positions */}
      {positions.length > 0 && (
        <div className="c" style={{ marginTop: 16 }}>
          <div className="k">Open Equity Positions ({positions.length})</div>
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
