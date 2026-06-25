import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiDelete, getToken, setToken, setAuthFailHandler, API } from './api'
import CandleChart from './CandleChart.jsx'
import RegimeStrip from './components/RegimeStrip.jsx'
import TradeExplainer from './components/TradeExplainer.jsx'
import OptionsHub from './components/OptionsHub.jsx'
import EquityHub from './components/EquityHub.jsx'
import SwingHub from './components/SwingHub.jsx'
import Portfolio from './components/Portfolio.jsx'
import DailyBrief from './components/DailyBrief.jsx'
import AutoTrader from './components/AutoTrader.jsx'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtUsd = (n) => n == null ? '–' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
const fmtFx = (n) => n == null ? '–' : Number(n).toFixed(5)
const fmtPnl = (n, fx) => n == null ? '–' : (fx ? '$' : '₹') + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// ── shared hooks ──
function useWallet(poll = true) {
  const [data, setData] = useState(null)
  const refresh = useCallback(async () => {
    try { setData(await apiGet('/me/wallet')) } catch { /* keep last */ }
  }, [])
  useEffect(() => {
    refresh()
    if (!poll) return
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh, poll])
  return { data, refresh }
}

function useCandles(symbol) {
  const [candles, setCandles] = useState(null)
  useEffect(() => {
    if (!symbol) return
    let live = true
    const load = async () => {
      try {
        const d = await apiGet(`/candles/${symbol}?interval=5m&period=1d`)
        if (live) setCandles(d.candles || [])
      } catch { /* keep last */ }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { live = false; clearInterval(t) }
  }, [symbol])
  return candles
}

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
      ws.onmessage = (e) => {
        try { setSnapshot(JSON.parse(e.data)) } catch {}
      }
      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 3000)
      }
      ws.onerror = () => { ws.close() }
    }
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [])
  return snapshot
}

// ── small shared bits ──
const Card = ({ k, v, cls }) =>
  <div className="c"><div className="k">{k}</div><div className={'v ' + (cls || '')}>{v}</div></div>

function WalletPanel({ wallet, refresh }) {
  const [dep, setDep] = useState('')
  if (!wallet) return <div className="answer">Loading wallet...</div>
  const w = wallet
  return <div className="wallet-section">
    <div className="wallet-header inr">Indian Market (INR)</div>
    <div className="cards">
      <Card k="Balance" v={fmt(w.balance)} />
      <Card k="Realized P&L" v={fmt(w.realized_pnl)} />
    </div>
    <div className="box" style={{ marginTop: 10 }}>
      <input type="number" placeholder="add paper funds (max ₹1,00,000)" value={dep}
             onChange={(e) => setDep(e.target.value)} />
      <button disabled={!dep} onClick={async () => {
        const r = await apiPost('/me/wallet/deposit', { amount: Number(dep) })
        if (r.error) alert(r.error)
        setDep(''); refresh()
      }}>Add</button>
    </div>
  </div>
}

function ForexWalletPanel({ wallet, refresh }) {
  const [dep, setDep] = useState('')
  if (!wallet) return <div className="answer">Loading forex wallet...</div>
  return <div className="wallet-section">
    <div className="wallet-header usd">Forex (USD)</div>
    <div className="cards">
      <Card k="Balance" v={fmtUsd(wallet.balance)} />
      <Card k="Realized P&L" v={fmtUsd(wallet.realized_pnl)} />
    </div>
    <div className="box" style={{ marginTop: 10 }}>
      <input type="number" placeholder="deposit USD (max $100k)" value={dep}
             onChange={(e) => setDep(e.target.value)} />
      <button disabled={!dep} onClick={async () => {
        const r = await apiPost('/me/forex-wallet/deposit', { amount: Number(dep) })
        if (r.error) alert(r.error)
        setDep(''); refresh()
      }}>Add</button>
    </div>
  </div>
}

function LiveEquityBar({ data, showForex }) {
  if (!data) return null
  const iCls = (data.unrealized || 0) >= 0 ? 'ok' : 'err'
  if (showForex) {
    const fCls = (data.forex_unrealized || 0) >= 0 ? 'ok' : 'err'
    return <div className="cards" style={{ marginTop: 12 }}>
      <Card k="Forex Live Equity" v={fmtUsd(data.forex_live_equity)} cls={fCls} />
      <Card k="Forex Unrealized" v={fmtUsd(data.forex_unrealized)} cls={fCls} />
    </div>
  }
  return <div className="cards" style={{ marginTop: 12 }}>
    <Card k="Live Equity" v={fmt(data.live_equity)} cls={iCls} />
    <Card k="Unrealized P&L" v={fmt(data.unrealized)} cls={iCls} />
  </div>
}

function Positions({ trades, refresh, title, fxMode }) {
  if (!trades || !trades.length) return <div className="mut" style={{ marginTop: 10 }}>No open positions.</div>
  return (
    <table className="hist">
      <thead><tr><th>Instrument</th><th>Qty</th><th>Entry</th><th>LTP</th><th>SL / Tgt</th><th>P&L</th><th></th></tr></thead>
      <tbody>{trades.map((t) => {
        const last = t.pnl_series?.length ? t.pnl_series[t.pnl_series.length - 1] : null
        const ltp = last ? last[1] : t.entry, pnl = last ? last[2] : 0
        const fx = t.segment === 'forex'
        const p = fx ? fmtFx : fmt
        return <tr key={t.id}>
          <td>{t.symbol}<div className="mut">{t.segment} · {t.side}</div></td>
          <td>{t.qty}</td><td>{p(t.entry)}</td><td>{p(ltp)}</td>
          <td>{p(t.stop)} / {p(t.target)}</td>
          <td className={pnl >= 0 ? 'ok' : 'err'}>{fmtPnl(pnl, fx)}</td>
          <td><button className="mini" onClick={async () => { await apiPost(`/me/trade/${t.id}/close`); refresh() }}>Square off</button></td>
        </tr>
      })}</tbody>
    </table>
  )
}

// ── P&L mini chart (SVG) ──
function PnlMiniChart({ series, fx }) {
  if (!series || series.length < 2) return null
  const w = 500, h = 100, pad = 20
  const pnls = series.map(s => s[2])
  const lo = Math.min(0, ...pnls), hi = Math.max(0, ...pnls)
  const span = hi - lo || 1
  const xp = (i) => pad + (i / (series.length - 1)) * (w - 2 * pad)
  const yp = (v) => h - pad - ((v - lo) / span) * (h - 2 * pad)
  const path = series.map((s, i) => `${i ? 'L' : 'M'}${xp(i).toFixed(1)},${yp(s[2]).toFixed(1)}`).join(' ')
  const last = pnls[pnls.length - 1]
  const col = last >= 0 ? '#22c55e' : '#ef4444'
  return <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ height: 100, marginTop: 8 }}>
    <line x1={pad} x2={w - pad} y1={yp(0)} y2={yp(0)} stroke="#2a3446" strokeDasharray="4 4" />
    <path d={`${path} L${xp(series.length - 1)},${yp(0)} L${xp(0)},${yp(0)} Z`} fill={col} opacity="0.12" />
    <path d={path} fill="none" stroke={col} strokeWidth="2" />
    <circle cx={xp(series.length - 1)} cy={yp(last)} r="3" fill={col} />
    <text x={w - pad} y={14} fill={col} fontSize="12" textAnchor="end" fontWeight="600">
      {fx ? fmtUsd(last) : fmt(last)}
    </text>
  </svg>
}

// ── views ──

function TradeButtons({ msg }) { return msg ? <div className="crumb" style={{ marginTop: 8 }}>{msg}</div> : null }

function FuturesView() {
  const { data, refresh } = useWallet()
  const [sym, setSym] = useState('NIFTY')
  const candles = useCandles(sym)
  const [levels, setLevels] = useState(null)
  const [msg, setMsg] = useState('')
  async function take(side) {
    setMsg('Placing...')
    try {
      const r = await apiPost('/me/trade', { segment: 'futures', underlying: sym, side })
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setLevels({ entry: t.entry, stop: t.stop, target: t.target })
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty}`); refresh()
    } catch (e) { setMsg(e.message) }
  }
  const indianTrades = (data?.open_trades || []).filter(t => t.segment !== 'forex')
  return <>
    <h2>Futures</h2><div className="crumb">Index futures (leveraged, ~15% SPAN margin)</div>
    <div className="row">
      <select value={sym} onChange={(e) => { setSym(e.target.value); setLevels(null) }}>
        <option>NIFTY</option><option>BANKNIFTY</option></select>
      <button className="trade-btn buy" onClick={() => take('long')}>Go Long</button>
      <button className="trade-btn sell" onClick={() => take('short')}>Go Short</button>
    </div>
    <TradeButtons msg={msg} />
    <CandleChart candles={candles} levels={levels} title={`${sym} · 5m`} />
    <div className="panel"><h3>Open positions</h3><Positions trades={indianTrades} refresh={refresh} /></div>
  </>
}

function ForexView() {
  const { data, refresh } = useWallet()
  const [pairs, setPairs] = useState([])
  const [pair, setPair] = useState('EUR/USD')
  const [candles, setCandles] = useState(null)
  const [signals, setSignals] = useState(null)
  const [levels, setLevels] = useState(null)
  const [msg, setMsg] = useState('')
  const [loadingSig, setLoadingSig] = useState(false)
  const [fxReco, setFxReco] = useState(null)
  const [recoLoading, setRecoLoading] = useState(true)
  useEffect(() => { apiGet('/forex/pairs').then(d => setPairs(d.pairs || [])).catch(() => {}) }, [])
  useEffect(() => {
    apiGet('/forex/recommendation').then(setFxReco).catch(() => {}).finally(() => setRecoLoading(false))
  }, [])
  useEffect(() => {
    if (!pair) return
    let live = true
    apiGet(`/forex/candles/${pair}?interval=15m&period=5d`)
      .then(d => { if (live) setCandles(d.candles || []) }).catch(() => {})
    return () => { live = false }
  }, [pair])
  async function loadSignals() {
    setLoadingSig(true)
    try {
      const d = await apiGet(`/forex/signals/${pair}`)
      setSignals(d)
    } catch (e) { setSignals({ error: e.message }) } finally { setLoadingSig(false) }
  }
  useEffect(() => { loadSignals() }, [pair])
  async function take(side) {
    setMsg('Placing...')
    try {
      const r = await apiPost('/me/trade', { segment: 'forex', pair, side })
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setLevels({ entry: t.entry, stop: t.stop, target: t.target })
      setMsg(`Opened ${t.symbol} ${side} @ ${t.entry} x${t.qty.toLocaleString()}`); refresh()
    } catch (e) { setMsg(e.message) }
  }
  async function takeReco() {
    const t = fxReco?.trade
    if (!t) return
    take(t.direction)
    setPair(t.pair)
  }
  const fxWallet = data?.forex_wallet
  const forexTrades = (data?.open_trades || []).filter(t => t.segment === 'forex')
  const dir = signals?.direction
  return <>
    <h2>Forex Trading</h2>
    <div className="crumb">Multi-timeframe confluence analysis · 27 indicators · paper trading</div>
    {fxWallet && <div className="cards" style={{ marginBottom: 14 }}>
      <Card k="Forex Balance" v={fmtUsd(fxWallet.balance)} />
      <Card k="Forex Realized" v={fmtUsd(fxWallet.realized_pnl)} />
    </div>}

    {recoLoading && <div className="panel"><div className="mut">Scanning all pairs for best setup...</div></div>}
    {fxReco && <div className="panel reco-panel">
      <h3>Best Forex Recommendation</h3>
      <div className="answer">{fxReco.answer}</div>
      {fxReco.trade && <button className="take-trade-btn" onClick={takeReco}>Execute This Trade</button>}
    </div>}

    <div className="row">
      <select className="pair-select" value={pair} onChange={(e) => { setPair(e.target.value); setLevels(null); setSignals(null) }}>
        {(pairs.length ? pairs : ['EUR/USD']).map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <button className="trade-btn buy" onClick={() => take('buy')}>Buy Long</button>
      <button className="trade-btn sell" onClick={() => take('sell')}>Sell Short</button>
    </div>
    <TradeButtons msg={msg} />
    {signals && !signals.error && <div className="panel">
      <h3>Confluence Signal — {pair}</h3>
      <div className="cards">
        <Card k="Direction" v={dir === 'none' ? 'No trade' : dir?.toUpperCase()} cls={dir === 'buy' ? 'ok' : dir === 'sell' ? 'err' : ''} />
        <Card k="Score" v={signals.score?.toFixed(3)} cls={signals.score > 0 ? 'ok' : signals.score < 0 ? 'err' : ''} />
        <Card k="Confidence" v={signals.confidence} />
        <Card k="TFs Agree" v={`${signals.agreeing_timeframes}/${signals.total_timeframes}`} />
      </div>
      {signals.tf_signals && <div style={{ marginTop: 12 }}>
        {Object.entries(signals.tf_signals).map(([tf, s]) =>
          <div key={tf} className="histrow">
            <div className="hr-top">
              <b>{tf.toUpperCase()}</b>
              <span className={'tag ' + (s.bias === 'bullish' ? 'ok' : s.bias === 'bearish' ? 'err' : '')}>{s.bias}</span>
            </div>
            <div className="hr-detail mut">
              Bullish: {s.bullish} · Bearish: {s.bearish} · Neutral: {s.neutral} (of {s.total})
            </div>
          </div>
        )}
      </div>}
      {signals.trade_plan && <div className="aiwhy" style={{ marginTop: 10 }}>
        Trade plan: {signals.trade_plan.direction?.toUpperCase()} @ {signals.trade_plan.entry},
        SL {signals.trade_plan.stop_loss} ({signals.trade_plan.sl_pips} pips),
        TP {signals.trade_plan.take_profit} ({signals.trade_plan.tp_pips} pips),
        R:R {signals.trade_plan.risk_reward}:1
        <button className="take-trade-btn inline" onClick={() => take(signals.trade_plan.direction)}>
          Take This Signal
        </button>
      </div>}
    </div>}
    {loadingSig && <div className="mut" style={{ marginTop: 8 }}>Analysing {pair} across all timeframes...</div>}
    <CandleChart candles={candles} levels={levels} title={`${pair} · 15m`} />
    <div className="panel"><h3>Forex Positions</h3><Positions trades={forexTrades} refresh={refresh} fxMode /></div>
  </>
}

function RecoView() {
  const { data, refresh } = useWallet()
  const [recos, setRecos] = useState(null)
  const [eqReco, setEqReco] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      apiGet('/recommendations').catch(() => null),
      apiGet('/equity/recommendation').catch(() => null),
    ]).then(([r, eq]) => {
      setRecos(r)
      setEqReco(eq)
    }).finally(() => setLoading(false))
  }, [])

  async function placeTrade(spec) {
    setMsg('Placing trade...')
    try {
      const r = await apiPost('/me/trade', spec)
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} x${t.qty} (SL ${fmt(t.stop)} · TGT ${fmt(t.target)})`)
      refresh()
    } catch (e) { setMsg(e.message) }
  }

  const bestOpt = recos?.best_per_segment?.options
  const bestEq = recos?.best_per_segment?.equity_intraday
  const bestSwing = recos?.best_per_segment?.swing
  const eqPick = eqReco?.recommendation

  return <>
    <h2>Best Recommendation</h2>
    <div className="crumb">Today's top picks across all segments — one click to execute</div>

    {msg && <div className="panel"><div className="crumb">{msg}</div></div>}
    {loading && <div className="mut">Scanning all markets for best setups...</div>}

    {/* 1. Best Option */}
    <div className="panel">
      <h3>Best Option Trade</h3>
      {bestOpt ? (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{bestOpt.symbol}</span>
            <span className={`seg-action ${bestOpt.action}`} style={{ marginLeft: 8 }}>{bestOpt.action}</span>
          </div>
          <div className={`seg-conf-val ${bestOpt.confidence >= 70 ? 'high' : bestOpt.confidence >= 45 ? 'mid' : 'low'}`}>
            {bestOpt.confidence}%
          </div>
        </div>
        <div className="seg-meta">
          <span>Entry <b>{fmt(bestOpt.entry)}</b></span>
          <span>SL <b>{fmt(bestOpt.stop)}</b></span>
          <span>TGT <b>{fmt(bestOpt.target)}</b></span>
          <span>R:R <b>{bestOpt.reward_risk}:1</b></span>
        </div>
        {bestOpt.reason && <div className="mut" style={{ marginTop: 4 }}>{bestOpt.reason}</div>}
        <button className="take-trade-btn" style={{ marginTop: 10 }} onClick={() => placeTrade(
          bestOpt.spec || { segment: 'options', underlying: bestOpt.symbol?.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY',
            leg: bestOpt.action === 'sell' ? 'PE' : 'CE' }
        )}>
          {bestOpt.action === 'sell' ? 'Buy PE' : 'Buy CE'} — Execute Now
        </button>
      </>) : !loading && <div className="mut">No option trade available right now</div>}
    </div>

    {/* 2. Best Intraday Equity */}
    <div className="panel">
      <h3>Best Intraday Equity</h3>
      {bestEq ? (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{bestEq.symbol}</span>
            <span className={`seg-action ${bestEq.action}`} style={{ marginLeft: 8 }}>{bestEq.action}</span>
          </div>
          <div className={`seg-conf-val ${bestEq.confidence >= 70 ? 'high' : bestEq.confidence >= 45 ? 'mid' : 'low'}`}>
            {bestEq.confidence}%
          </div>
        </div>
        <div className="seg-meta">
          <span>Entry <b>{fmt(bestEq.entry)}</b></span>
          <span>SL <b>{fmt(bestEq.stop)}</b></span>
          <span>TGT <b>{fmt(bestEq.target)}</b></span>
          <span>R:R <b>{bestEq.reward_risk}:1</b></span>
        </div>
        {bestEq.reason && <div className="mut" style={{ marginTop: 4 }}>{bestEq.reason}</div>}
        <button className="take-trade-btn" style={{ marginTop: 10 }} onClick={() => placeTrade(
          bestEq.spec || { segment: 'equity', symbol: bestEq.symbol, side: bestEq.action === 'sell' ? 'short' : 'long' }
        )}>
          {bestEq.action === 'sell' ? 'Sell Short' : 'Buy Long'} — Execute Now
        </button>
      </>) : eqPick ? (<>
        <div className="answer">{eqPick.answer}</div>
        {eqPick.spec && <button className="take-trade-btn" style={{ marginTop: 10 }} onClick={() => placeTrade(eqPick.spec)}>
          Execute Now
        </button>}
      </>) : !loading && <div className="mut">No intraday equity trade available right now</div>}
    </div>

    {/* 3. Best Swing */}
    <div className="panel">
      <h3>Best Swing Trade</h3>
      {bestSwing ? (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{bestSwing.symbol}</span>
            <span className={`seg-action ${bestSwing.action}`} style={{ marginLeft: 8 }}>{bestSwing.action}</span>
          </div>
          <div className={`seg-conf-val ${bestSwing.confidence >= 70 ? 'high' : bestSwing.confidence >= 45 ? 'mid' : 'low'}`}>
            {bestSwing.confidence}%
          </div>
        </div>
        <div className="seg-meta">
          <span>Entry <b>{fmt(bestSwing.entry)}</b></span>
          <span>SL <b>{fmt(bestSwing.stop)}</b></span>
          <span>TGT <b>{fmt(bestSwing.target)}</b></span>
          <span>R:R <b>{bestSwing.reward_risk}:1</b></span>
        </div>
        {bestSwing.reason && <div className="mut" style={{ marginTop: 4 }}>{bestSwing.reason}</div>}
        <button className="take-trade-btn" style={{ marginTop: 10 }} onClick={() => placeTrade(
          bestSwing.spec || { segment: 'equity', symbol: bestSwing.symbol, side: bestSwing.action === 'sell' ? 'short' : 'long' }
        )}>
          {bestSwing.action === 'sell' ? 'Sell Short' : 'Buy Long'} — Execute Now
        </button>
      </>) : !loading && <div className="mut">No swing setup available right now</div>}
    </div>

    <div className="panel"><h3>Open positions</h3><Positions trades={data?.open_trades} refresh={refresh} /></div>
  </>
}

function HistRow({ t }) {
  const [why, setWhy] = useState(t.ai_why || '')
  const [busy, setBusy] = useState(false)
  const closed = t.status !== 'open'
  const fx = t.segment === 'forex'
  const p = fx ? fmtUsd : fmt
  async function explain() {
    setBusy(true); setWhy('Analyzing why this trade was taken...')
    try { const d = await apiPost(`/me/trade/${t.id}/explain`); setWhy(d.ai_why || d.error || '(no analysis)') }
    catch (e) { setWhy(e.message) } finally { setBusy(false) }
  }
  return <div className="histrow">
    <div className="hr-top">
      <div><b>{t.symbol}</b> <span className="mut">{t.segment} · {t.side}</span>{' '}
        <span className="tag">{closed ? (t.exit_reason || 'closed') : 'OPEN'}</span></div>
      <div className={closed ? (t.net_pnl >= 0 ? 'ok' : 'err') : 'mut'} style={{ fontWeight: 600 }}>
        {closed ? p(t.net_pnl) : 'live'}</div>
    </div>
    <div className="mut hr-detail">Entry {p(t.entry)} · SL {p(t.stop)} · TGT {p(t.target)}{
      closed ? ` · Exit ${p(t.exit_price)}` : ''} · Qty {t.qty}</div>
    {t.analysis && <div className="mut hr-detail">{t.analysis}</div>}
    <button className="mini" disabled={busy} onClick={explain} style={{ marginTop: 8 }}>Why this trade?</button>
    {why && <div className="aiwhy">{why}</div>}
  </div>
}

function HistoryView() {
  const [trades, setTrades] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { apiGet('/me/history').then((d) => setTrades(d.trades || [])).catch((e) => setErr(e.message)) }, [])
  return <>
    <h2>Trade History</h2><div className="crumb">Every paper trade you've taken, grouped by date</div>
    {err && <div className="answer err">{err}</div>}
    {!err && !trades && <div className="mut">Loading...</div>}
    {trades && !trades.length && <div className="mut">No trades yet — place one from a trade page.</div>}
    {trades && trades.length > 0 && (() => {
      const groups = {}
      trades.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t) })
      return Object.keys(groups).sort().reverse().map((date) => {
        const day = groups[date], closed = day.filter((t) => t.status !== 'open')
        const net = closed.reduce((s, t) => s + (t.net_pnl || 0), 0)
        const hasFx = day.some(t => t.segment === 'forex')
        return <div className="panel" key={date}>
          <h3>{date} <span className={net >= 0 ? 'ok' : 'err'} style={{ fontWeight: 500, fontSize: 13 }}>
            · {day.length} trade{day.length > 1 ? 's' : ''}, net {hasFx ? fmtUsd(net) : fmt(net)}</span></h3>
          {day.map((t) => <HistRow key={t.id} t={t} />)}
        </div>
      })
    })()}
  </>
}

function AdminView({ user }) {
  const [overview, setOverview] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const load = useCallback(() => {
    apiGet('/admin/overview').then((d) => setOverview(d.overview || [])).catch((e) => setErr(e.message))
  }, [])
  useEffect(() => { load() }, [load])
  async function setRole(uid, role) {
    setMsg('')
    try { await apiPost(`/admin/users/${uid}/role`, { role }); setMsg('Role updated.'); load() }
    catch (e) { setMsg(e.message); load() }
  }
  return <>
    <h2>All Users</h2><div className="crumb">Owner view — every paper wallet</div>
    {err && <div className="answer err">{err}</div>}
    {!err && !overview && <div className="mut">Loading...</div>}
    {overview && (
      <table className="hist">
        <thead><tr><th>User</th><th>Role</th><th>Balance</th><th>Live equity</th><th>Realized</th><th>Open</th></tr></thead>
        <tbody>{overview.map((o) => {
          const u = o.user, self = u.id === user.id
          return <tr key={u.id}>
            <td>{u.email}</td>
            <td>{self ? <span className="tag">{u.role} (you)</span> :
              <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}>
                <option value="user">user</option><option value="admin">admin</option></select>}</td>
            <td>{fmt(o.wallet?.balance)}</td><td>{fmt(o.live_equity)}</td>
            <td>{fmt(o.wallet?.realized_pnl)}</td>
            <td>{(o.open_trades || []).map((t) => t.symbol).join(', ') || '—'}</td>
          </tr>
        })}</tbody>
      </table>
    )}
    {msg && <div className="crumb" style={{ marginTop: 8 }}>{msg}</div>}
  </>
}

function AskView() {
  const [q, setQ] = useState('best banknifty intraday option today')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  async function ask(query) {
    const text = (query ?? q).trim(); if (!text) return
    setLoading(true); setErr(''); setRes(null)
    try { setRes(await apiPost('/query', { q: text, polish: false })) }
    catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  return <>
    <h2>Ask AI</h2><div className="crumb">Natural-language query over the engines</div>
    <div className="box">
      <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
             placeholder="e.g. best banknifty intraday option today" />
      <button onClick={() => ask()} disabled={loading}>{loading ? '...' : 'Ask'}</button>
    </div>
    {loading && <div className="answer">Thinking... (first call can take a few seconds)</div>}
    {err && <div className="answer err">{err}</div>}
    {res && !loading && <>
      <div className="answer">{res.answer || '(no answer)'}</div>
      <div className="meta">intent: {res.intent || '-'}{res.symbol ? ' · ' + res.symbol : ''}</div>
      <details><summary>Show full data (JSON)</summary><pre>{JSON.stringify(res.data, null, 2)}</pre></details>
    </>}
  </>
}

// ── Forex Beta Dashboard ──
function ForexBetaDashboard() {
  const { data, refresh } = useWallet()
  const [forexMode, setForexMode] = useState('custom')
  const [toggling, setToggling] = useState(false)
  const [autoOpened, setAutoOpened] = useState(null)
  const live = useLiveStream()

  useEffect(() => {
    if (data?.forex_trade_mode) setForexMode(data.forex_trade_mode)
  }, [data])

  async function toggleMode(mode) {
    setToggling(true); setAutoOpened(null)
    try {
      const r = await apiPost('/me/mode/forex', { mode })
      if (r.auto_opened) setAutoOpened(r.auto_opened)
      setForexMode(mode); refresh()
    } catch (e) { alert(e.message) } finally { setToggling(false) }
  }

  const merged = data ? { ...data } : null
  if (merged && live) {
    merged.forex_live_equity = live.forex_equity ?? merged.forex_live_equity
    if (live.trades?.length) {
      merged.forex_unrealized = live.trades.filter(t => t.segment === 'forex').reduce((s, t) => s + (t.gross_pnl || 0), 0)
    }
  }
  const forexTrades = merged?.forex_open_trades || (merged?.open_trades || []).filter(t => t.segment === 'forex')

  return <>
    <h2>Forex Dashboard <span className="beta-tag">BETA</span></h2>
    <div className="crumb">Multi-timeframe confluence · 27 indicators · paper trading</div>

    <div className="mode-toggle" style={{ marginBottom: 16 }}>
      <div className="mode-label">Forex ML Mode</div>
      <div className="mode-switch">
        <button className={'mode-btn' + (forexMode !== 'ml' ? ' active' : '')}
                disabled={toggling} onClick={() => toggleMode('custom')}>
          Custom <span className="mode-desc">Manual trading</span>
        </button>
        <button className={'mode-btn ml' + (forexMode === 'ml' ? ' active' : '')}
                disabled={toggling} onClick={() => toggleMode('ml')}>
          ML Auto <span className="mode-desc">24/5 confluence engine</span>
        </button>
      </div>
      {forexMode === 'ml' && <div className="mode-info">
        Auto-trades forex 24/5 using multi-timeframe confluence (27 indicators). Manages SL & TP automatically.
      </div>}
      {autoOpened && autoOpened.length > 0 && <div className="auto-opened-feedback">
        {autoOpened.map((a, i) => <div key={i} className={'auto-msg ' + (a.error ? 'err' : a.trade ? 'ok' : '')}>
          {a.trade ? `Opened ${a.symbol} (${a.trade.side})` :
           a.error ? `Error: ${a.error}` : a.info || 'No trade available'}
        </div>)}
      </div>}
    </div>

    <ForexWalletPanel wallet={merged?.forex_wallet} refresh={refresh} />
    <LiveEquityBar data={merged} showForex />

    <div className="panel">
      <h3>Forex Positions ({forexTrades.length})</h3>
      <Positions trades={forexTrades} refresh={refresh} fxMode />
      {forexTrades.map(t => <PnlMiniChart key={t.id} series={t.pnl_series} fx={true} />)}
    </div>
    <div className="foot">Forex module is in beta · confluence engine under active development</div>
  </>
}

// ── Settings: Trading Mode + Broker Config ──
function SettingsView({ tradingMode, setTradingMode }) {
  const [brokerCfg, setBrokerCfg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ api_key: '', client_id: '', password: '', totp_secret: '' })
  const [showForm, setShowForm] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    apiGet('/me/broker-config').then(setBrokerCfg).catch(() => {})
  }, [])

  async function switchMode(mode) {
    setSwitching(true); setMsg('')
    try {
      const r = await apiPost('/me/trading-mode', { mode })
      setTradingMode(r.trading_mode)
      setMsg(`Switched to ${r.trading_mode} mode`)
    } catch (e) { setMsg(e.message) } finally { setSwitching(false) }
  }

  async function saveBroker() {
    if (!form.api_key || !form.client_id || !form.password || !form.totp_secret) {
      setMsg('All 4 fields are required'); return
    }
    setSaving(true); setMsg('')
    try {
      await apiPost('/me/broker-config', form)
      setMsg('Broker configured successfully')
      setShowForm(false)
      setForm({ api_key: '', client_id: '', password: '', totp_secret: '' })
      const cfg = await apiGet('/me/broker-config')
      setBrokerCfg(cfg)
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  async function removeBroker() {
    if (!confirm('Remove broker config and switch to paper mode?')) return
    setSaving(true); setMsg('')
    try {
      await apiDelete('/me/broker-config')
      setBrokerCfg(null)
      setTradingMode('paper')
      setMsg('Broker config removed, switched to paper mode')
      const cfg = await apiGet('/me/broker-config')
      setBrokerCfg(cfg)
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const configured = brokerCfg?.configured

  return <>
    <h2>Settings</h2>
    <div className="crumb">Trading mode & broker configuration</div>

    {/* Trading Mode */}
    <div className="panel">
      <h3>Trading Mode</h3>
      <div className="trading-mode-switch">
        <button className={'tmode-btn' + (tradingMode === 'paper' ? ' active paper' : '')}
                disabled={switching} onClick={() => switchMode('paper')}>
          <span className="tmode-icon">📝</span>
          <span className="tmode-title">Paper Trading</span>
          <span className="tmode-desc">Simulated trades with virtual money. No real orders.</span>
        </button>
        <button className={'tmode-btn' + (tradingMode === 'live' ? ' active live' : '')}
                disabled={switching || !configured}
                onClick={() => switchMode('live')}>
          <span className="tmode-icon">⚡</span>
          <span className="tmode-title">Live Trading</span>
          <span className="tmode-desc">{configured
            ? 'Real orders sent to your broker account.'
            : 'Configure your broker below to enable.'}</span>
        </button>
      </div>
      {!configured && tradingMode === 'paper' &&
        <div className="mut" style={{ marginTop: 10, fontSize: 13 }}>
          Set up your Angel One broker account below to unlock live trading.
        </div>}
    </div>

    {/* Broker Config */}
    <div className="panel">
      <h3>Broker Account — Angel One</h3>
      {brokerCfg === null ? <div className="mut">Loading...</div> : <>
        {configured ? <div className="broker-status configured">
          <div className="broker-check">Configured</div>
          <div className="broker-detail">
            Client ID: {brokerCfg.client_id_display || '***'} ·
            API Key: {brokerCfg.has_api_key ? 'Set' : 'Missing'} ·
            TOTP: {brokerCfg.has_totp ? 'Set' : 'Missing'}
          </div>
          {brokerCfg.updated_at && <div className="mut">Last updated: {new Date(brokerCfg.updated_at).toLocaleDateString()}</div>}
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="mini" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Update Credentials'}
            </button>
            <button className="mini" style={{ color: 'var(--bad)' }} onClick={removeBroker} disabled={saving}>
              Remove
            </button>
          </div>
        </div> : <div className="broker-status not-configured">
          <div className="broker-check missing">Not Configured</div>
          <div className="mut" style={{ marginTop: 6 }}>
            Connect your Angel One demat account to enable live trading.
          </div>
          <button className="mini" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
            Set Up Broker
          </button>
        </div>}

        {(showForm || !configured) && showForm !== false && <div className="broker-form">
          <div className="broker-form-note">
            Your credentials are stored securely and used only to place orders on your behalf.
            You can find these in your Angel One SmartAPI dashboard.
          </div>
          <label>API Key</label>
          <input type="text" value={form.api_key} placeholder="Your SmartAPI key"
                 onChange={e => setForm({ ...form, api_key: e.target.value })} />
          <label>Client ID</label>
          <input type="text" value={form.client_id} placeholder="e.g. D12345"
                 onChange={e => setForm({ ...form, client_id: e.target.value })} />
          <label>Password</label>
          <input type="password" value={form.password} placeholder="Your trading password"
                 onChange={e => setForm({ ...form, password: e.target.value })} />
          <label>TOTP Secret</label>
          <input type="text" value={form.totp_secret} placeholder="Base32 TOTP key from SmartAPI"
                 onChange={e => setForm({ ...form, totp_secret: e.target.value })} />
          <button onClick={saveBroker} disabled={saving} style={{ marginTop: 12 }}>
            {saving ? 'Saving...' : 'Save Broker Config'}
          </button>
        </div>}
      </>}
    </div>

    {msg && <div className="panel"><div className={msg.includes('Error') || msg.includes('required') ? 'answer err' : 'answer'}>{msg}</div></div>}

    <div className="panel">
      <h3>About Trading Modes</h3>
      <div className="answer" style={{ fontSize: 13 }}>
        <b>Paper mode</b> — All trades are simulated with virtual capital. Prices are real (live market data), but no actual orders are placed. Use this to test strategies risk-free.<br /><br />
        <b>Live mode</b> — Orders are routed to your Angel One broker account. Real money is at stake. A kill switch is available in admin panel to halt all orders instantly.<br /><br />
        Your trading mode preference is saved and persists across sessions.
      </div>
    </div>
  </>
}

// ── sidebar / shell / auth ──
const NAV = [
  { group: 'Dashboard' },
  { id: 'brief', label: 'Home' },
  { group: 'Trade' },
  { id: 'auto', label: 'Auto Trader (ML)' },
  { id: 'options', label: 'Options' },
  { id: 'equity', label: 'Equity Intraday' },
  { id: 'swing', label: 'Swing' },
  { group: 'Portfolio' },
  { id: 'portfolio', label: 'Positions & Capital' },
  { id: 'reco', label: 'Recommendations' },
  { id: 'history', label: 'Trade History' },
  { id: 'settings', label: 'Settings' },
]

function ChangePassword() {
  const [oldp, setOldp] = useState(''), [newp, setNewp] = useState(''), [msg, setMsg] = useState('')
  async function save() {
    if (!oldp || !newp) { setMsg('fill both fields'); return }
    try {
      await apiPost('/auth/change-password', { old_password: oldp, new_password: newp })
      setMsg('Password updated.'); setOldp(''); setNewp('')
    } catch (e) { setMsg(e.message) }
  }
  return <div className="pwform">
    <input type="password" placeholder="Current password" value={oldp} onChange={(e) => setOldp(e.target.value)} />
    <input type="password" placeholder="New password (min 6)" value={newp} onChange={(e) => setNewp(e.target.value)} />
    <button className="mini full" onClick={save}>Save new password</button>
    {msg && <div className="pwmsg">{msg}</div>}
  </div>
}

function Sidebar({ user, view, setView, onLogout, tradingMode }) {
  const [pwOpen, setPwOpen] = useState(false)
  return <aside className="sidebar">
    <div className="brand">Trading-AI
      <small>{tradingMode === 'live'
        ? <span className="live-indicator"><span className="live-dot" /> live trading</span>
        : 'paper trading'} · not financial advice</small>
    </div>
    <nav className="snav">
      {NAV.map((it, i) => it.group
        ? <div className="group-label" key={'g' + i}>{it.group}</div>
        : <div key={it.id} className={'snav-item' + (it.sub ? ' sub' : '') + (view === it.id ? ' active' : '')}
               onClick={() => setView(it.id)}>{it.label}</div>)}
      {user.role === 'admin' && <>
        <div className="group-label">Admin</div>
        <div className={'snav-item' + (view === 'admin' ? ' active' : '')} onClick={() => setView('admin')}>All Users</div>
      </>}
    </nav>
    <div className="userbox">
      <b>{user.display_name || user.email}</b>
      {user.display_name && <div className="mut">{user.email}</div>}
      <span className="role">{user.role}{user.auth_provider === 'google' ? ' · Google' : ''}</span>
      {user.auth_provider !== 'google' && <button className="mini full" onClick={() => setPwOpen(!pwOpen)}>Change password</button>}
      {pwOpen && <ChangePassword />}
      <button className="mini full" onClick={onLogout}>Log out</button>
    </div>
  </aside>
}

function AuthGate({ onAuth }) {
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const d = await apiPost(signup ? '/auth/signup' : '/auth/login', { email, password: pw }, { auth: false })
      setToken(d.token); onAuth(d.user)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function googleLogin() {
    setErr(''); setBusy(true)
    try {
      if (!window.google?.accounts?.id) {
        setErr('Google Sign-In not loaded. Check GOOGLE_CLIENT_ID config.')
        setBusy(false)
        return
      }
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setErr('Google popup was blocked or dismissed.')
          setBusy(false)
        }
      })
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  const [googleReady, setGoogleReady] = useState(false)
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = async () => {
      try {
        const cfg = await (await fetch(`${API}/auth/config`)).json()
        const clientId = cfg.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID
        if (!clientId || !window.google?.accounts?.id) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const d = await apiPost('/auth/google', { id_token: response.credential }, { auth: false })
              setToken(d.token); onAuth(d.user)
            } catch (e) { setErr(e.message) }
          }
        })
        setGoogleReady(true)
      } catch {}
    }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [])

  return <div className="authwrap">
    <form className="auth-card" onSubmit={submit}>
      <h1>Trading-AI</h1>
      <div className="sub">{signup ? 'Create your paper-trading account' : 'Sign in to your paper-trading account'}</div>

      {googleReady && <>
        <button type="button" className="google-btn" onClick={googleLogin} disabled={busy}>
          <svg viewBox="0 0 24 24" width="18" height="18" style={{marginRight: 8}}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <div className="auth-divider"><span>or</span></div>
      </>}

      <label>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      <label>Password</label>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" minLength={6} required />
      <button className="primary" disabled={busy}>{busy ? '...' : (signup ? 'Sign up' : 'Log in')}</button>
      {err && <div className="auth-err">{err}</div>}
      <div className="auth-toggle">
        {signup ? 'Already have an account? ' : 'New here? '}
        <a onClick={() => { setSignup(!signup); setErr('') }}>{signup ? 'Log in' : 'Create an account'}</a>
      </div>
    </form>
  </div>
}

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('brief')
  const [booting, setBooting] = useState(true)
  const [tradingMode, setTradingMode] = useState('paper')
  const [explainRec, setExplainRec] = useState(null)

  useEffect(() => {
    setAuthFailHandler(() => setUser(null))
    if (getToken()) {
      Promise.all([
        apiGet('/auth/me').catch(() => { setToken(null); return null }),
        apiGet('/me/trading-mode').catch(() => ({ trading_mode: 'paper' })),
      ]).then(([u, tm]) => {
        if (u) setUser(u)
        if (tm) setTradingMode(tm.trading_mode || 'paper')
      }).finally(() => setBooting(false))
    } else setBooting(false)
  }, [])

  const logout = () => { setToken(null); setUser(null) }

  if (booting) return <div className="authwrap"><div className="mut">Loading...</div></div>
  if (!user) return <AuthGate onAuth={(u) => {
    setUser(u); setView('brief')
    apiGet('/me/trading-mode').then(r => setTradingMode(r.trading_mode || 'paper')).catch(() => {})
  }} />

  return <div className="app">
    <Sidebar user={user} view={view} setView={setView} onLogout={logout} tradingMode={tradingMode} />
    <main className="main">
      <RegimeStrip />
      {view === 'brief' && <DailyBrief />}
      {view === 'auto' && <AutoTrader />}
      {view === 'options' && <OptionsHub onExplain={setExplainRec} />}
      {view === 'equity' && <EquityHub onExplain={setExplainRec} />}
      {view === 'swing' && <SwingHub onExplain={setExplainRec} />}
      {view === 'portfolio' && <Portfolio />}
      {view === 'reco' && <RecoView />}
      {view === 'history' && <HistoryView />}
      {view === 'settings' && <SettingsView tradingMode={tradingMode} setTradingMode={setTradingMode} />}
      {view === 'admin' && <AdminView user={user} />}
      {explainRec && <TradeExplainer rec={explainRec} onClose={() => setExplainRec(null)} />}
    </main>
  </div>
}
