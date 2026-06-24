import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '-' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const GRADE_COLORS = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#f59e0b', 'C': '#f97316' }
const TIER_COLORS = {
  TIER_1A: '#22c55e', TIER_1B: '#86efac', TIER_2A: '#3b82f6',
  TIER_2B: '#60a5fa', TIER_2C: '#f59e0b', NO_TRADE: '#6b7280',
}

export default function OptionsHub({ onExplain }) {
  const [picks, setPicks] = useState([])
  const [graded, setGraded] = useState([])
  const [best, setBest] = useState(null)
  const [strikes, setStrikes] = useState({})
  const [mlOptions, setMlOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [positions, setPositions] = useState([])
  const [activeTab, setActiveTab] = useState('signals')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reco, wallet, p2, niftyStrikes, bnStrikes, mlOpt] = await Promise.all([
        apiGet('/recommendations'),
        apiGet('/me/wallet'),
        apiGet('/phase2/recommendations').catch(() => null),
        apiGet('/ml/intraday/strikes/NIFTY').catch(() => null),
        apiGet('/ml/intraday/strikes/BANKNIFTY').catch(() => null),
        apiGet('/ml/intraday/options').catch(() => null),
      ])
      setPicks(reco?.options || [])
      setBest(reco?.best_per_segment?.options || null)
      setPositions((wallet?.open_trades || []).filter(t => t.segment === 'options'))

      const stk = {}
      if (niftyStrikes?.contracts) stk.NIFTY = niftyStrikes.contracts
      if (bnStrikes?.contracts) stk.BANKNIFTY = bnStrikes.contracts
      setStrikes(stk)

      if (mlOpt?.trades) setMlOptions(mlOpt.trades)

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
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty} (SL ${fmt(t.stop)} / TGT ${fmt(t.target)})`)
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

  const tabs = [
    { id: 'signals', label: 'Best Picks' },
    { id: 'strikes', label: 'Strike Ranking' },
    { id: 'graded', label: 'Graded' },
    { id: 'all', label: 'All Picks' },
  ]

  return (
    <div style={{ padding: 16 }}>
      <h2>Options</h2>
      <div className="crumb">NIFTY & BANKNIFTY — V2 signals, ML strike ranking, graded recommendations</div>

      {msg && <div className="crumb" style={{ marginBottom: 8 }}>{msg}</div>}

      {/* Tab bar */}
      <div className="row" style={{ marginBottom: 16, gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} className={'tab' + (activeTab === t.id ? ' on' : '')}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Best Picks tab */}
      {activeTab === 'signals' && <>
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
              </div>
            </div>
            <div style={{ fontSize: 12, marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Entry <b>{fmt(best.entry)}</b></span>
              <span>SL <b>{fmt(best.stop)}</b></span>
              <span>TGT <b>{fmt(best.target)}</b></span>
              <span>R:R <b>{best.reward_risk}:1</b></span>
            </div>
            {best.reason && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{best.reason}</div>}
            <button className="take-trade-btn" onClick={() => tradeFromPick(best)} style={{ marginTop: 8 }}>
              Execute This Trade
            </button>
          </div>
        )}

        {mlOptions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>ML Intraday Options ({mlOptions.length})</h3>
            {mlOptions.map((t, i) => (
              <div key={i} className="c" style={{ marginBottom: 8, borderLeft: '3px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{t.symbol || t.contract}</span>
                  <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: 12 }}>
                    {t.confidence ? `${(t.confidence * 100).toFixed(0)}%` : ''} ML
                  </span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {t.entry && <span>Entry <b>{fmt(t.entry)}</b></span>}
                  {t.stop && <span>SL <b>{fmt(t.stop)}</b></span>}
                  {t.target && <span>TGT <b>{fmt(t.target)}</b></span>}
                  {t.side && <span className={t.side === 'long' ? 'ok' : 'err'}>{t.side}</span>}
                </div>
                <button className="take-trade-btn" onClick={() => tradeFromPick(t)} style={{ marginTop: 6 }}>
                  Execute
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && !best && mlOptions.length === 0 && (
          <div className="c" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 16 }}>No option picks right now</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
              Check Strike Ranking tab or wait for signals during market hours
            </div>
          </div>
        )}
      </>}

      {/* Strike Ranking tab */}
      {activeTab === 'strikes' && <>
        {Object.keys(strikes).length === 0 && (
          <div className="panel"><div className="mut">No strike data available. Data is collected during market hours.</div></div>
        )}
        {Object.entries(strikes).map(([sym, contracts]) => (
          <div key={sym} className="panel">
            <h3>{sym} — Top Strikes</h3>
            <table className="hist">
              <thead>
                <tr><th>Contract</th><th>Score</th><th>OI</th><th>Volume</th><th>IV</th><th></th></tr>
              </thead>
              <tbody>
                {(contracts || []).slice(0, 5).map((c, i) => (
                  <tr key={i}>
                    <td>
                      <b>{c.strike} {c.option_type || c.type}</b>
                      {c.tier && <span className="signal-tier" style={{
                        color: TIER_COLORS[c.tier], marginLeft: 8, fontSize: 10
                      }}>{c.tier}</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{(c.score || c.rank_score || 0).toFixed(1)}</td>
                    <td>{c.oi ? (c.oi / 1000).toFixed(0) + 'K' : '-'}</td>
                    <td>{c.volume ? (c.volume / 1000).toFixed(0) + 'K' : '-'}</td>
                    <td>{c.iv ? (c.iv * 100).toFixed(1) + '%' : '-'}</td>
                    <td>
                      <button className="mini" onClick={() => trade(sym, c.option_type || c.type)}>
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </>}

      {/* Graded tab */}
      {activeTab === 'graded' && <>
        {graded.length === 0 && <div className="panel"><div className="mut">No graded option recommendations available.</div></div>}
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
                  Entry: {rec.signal.entry} / SL: {rec.signal.stop_loss} / Target: {rec.signal.target}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="take-trade-btn" onClick={() => tradeFromPick(rec)}>Execute</button>
                <button onClick={() => onExplain && onExplain(rec)} style={{
                  background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
                  padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                }}>Why?</button>
              </div>
            </div>
          )
        })}
      </>}

      {/* All Picks tab */}
      {activeTab === 'all' && <>
        {picks.length === 0 && <div className="panel"><div className="mut">No option picks from Phase 1 pipeline.</div></div>}
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
              <button className="take-trade-btn" onClick={() => tradeFromPick(p)} style={{ marginTop: 6 }}>
                Execute
              </button>
            </div>
          )
        })}
      </>}

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
