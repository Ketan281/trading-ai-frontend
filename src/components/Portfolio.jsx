import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const STATE_COLORS = {
  normal: '#22c55e', caution: '#f59e0b', restricted: '#f97316', halt: '#ef4444',
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

  const load = useCallback(async () => {
    try {
      const [w, alloc, p] = await Promise.all([
        apiGet('/me/wallet'),
        apiGet('/recommendations/allocate').catch(() => null),
        apiGet('/phase2/psychology').catch(() => null),
      ])
      setWallet(w)
      setPositions((w?.open_trades || []).filter(t => t.segment !== 'forex'))
      if (w?.indian_trade_mode) setIndianMode(w.indian_trade_mode)
      if (alloc) {
        setAllocation(alloc.allocation)
        setAllocBalance(alloc.balance)
      }
      if (p) setPsych(p)
    } catch {}
  }, [])

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
      <h2>Portfolio</h2>
      <div className="crumb">Capital management — ML or manual mode with psychology-aware sizing</div>

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
          Auto-trades Indian market during 9:15–15:15 IST. Picks best option/future, manages SL & target.
        </div>}
        {autoOpened && autoOpened.length > 0 && <div className="auto-opened-feedback" style={{ marginTop: 8 }}>
          {autoOpened.map((a, i) => <div key={i} className={'auto-msg ' + (a.error ? 'err' : a.trade ? 'ok' : '')}>
            {a.trade ? `Opened ${a.symbol} (${a.trade.side})` :
             a.error ? `Error: ${a.error}` : a.info || 'No trade available'}
          </div>)}
        </div>}
      </div>

      {/* Wallet + Psychology side by side */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Wallet */}
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
                <input type="number" placeholder="Add paper funds (INR)" value={dep}
                  onChange={(e) => setDep(e.target.value)}
                  style={{ flex: 1, fontSize: 12 }} />
                <button className="mini" disabled={!dep} onClick={async () => {
                  await apiPost('/me/wallet/deposit', { amount: Number(dep) })
                  setDep(''); load()
                }}>Add</button>
              </div>
            </>
          ) : <div className="mut">Loading...</div>}
        </div>

        {/* Psychology state */}
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

      {/* Open positions */}
      <div className="c">
        <div className="k">Open Positions ({positions.length})</div>
        {positions.length === 0 ? (
          <div className="mut" style={{ marginTop: 8 }}>No open positions.</div>
        ) : (
          <table className="hist" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Instrument</th><th>Qty</th><th>Entry</th><th>SL / Tgt</th><th>P&L</th><th></th></tr>
            </thead>
            <tbody>{positions.map((t) => {
              const last = t.pnl_series?.length ? t.pnl_series[t.pnl_series.length - 1] : null
              const pnl = last ? last[2] : 0
              return <tr key={t.id}>
                <td>{t.symbol}<div className="mut">{t.segment} · {t.side}</div></td>
                <td>{t.qty}</td><td>{fmt(t.entry)}</td>
                <td>{fmt(t.stop)} / {fmt(t.target)}</td>
                <td className={pnl >= 0 ? 'ok' : 'err'}>{fmt(pnl)}</td>
                <td><button className="mini" onClick={async () => {
                  await apiPost(`/me/trade/${t.id}/close`); load()
                }}>Square off</button></td>
              </tr>
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
