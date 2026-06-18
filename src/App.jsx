import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, getToken, setToken, setAuthFailHandler } from './api'
import CandleChart from './CandleChart.jsx'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

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

// ── small shared bits ──
const Card = ({ k, v, cls }) =>
  <div className="c"><div className="k">{k}</div><div className={'v ' + (cls || '')}>{v}</div></div>

function WalletPanel({ wallet, refresh }) {
  const [dep, setDep] = useState('')
  if (!wallet) return <div className="answer">Loading wallet…</div>
  const w = wallet.wallet, cls = (wallet.unrealized || 0) >= 0 ? 'ok' : 'err'
  return <>
    <div className="cards">
      <Card k="Balance" v={fmt(w.balance)} />
      <Card k="Live equity" v={fmt(wallet.live_equity)} />
      <Card k="Unrealized" v={fmt(wallet.unrealized)} cls={cls} />
      <Card k="Realized P&L" v={fmt(w.realized_pnl)} />
    </div>
    <div className="box" style={{ marginTop: 12 }}>
      <input type="number" placeholder="add paper funds (e.g. 50000)" value={dep}
             onChange={(e) => setDep(e.target.value)} />
      <button disabled={!dep} onClick={async () => {
        const r = await apiPost('/me/wallet/deposit', { amount: Number(dep) })
        if (r.error) alert(r.error)
        setDep(''); refresh()
      }}>Add</button>
    </div>
  </>
}

function Positions({ trades, refresh }) {
  if (!trades || !trades.length) return <div className="mut" style={{ marginTop: 10 }}>No open positions.</div>
  return (
    <table className="hist">
      <thead><tr><th>Instrument</th><th>Qty</th><th>Entry</th><th>LTP</th><th>SL / Tgt</th><th>P&L</th><th></th></tr></thead>
      <tbody>{trades.map((t) => {
        const last = t.pnl_series?.length ? t.pnl_series[t.pnl_series.length - 1] : null
        const ltp = last ? last[1] : t.entry, pnl = last ? last[2] : 0
        return <tr key={t.id}>
          <td>{t.symbol}<div className="mut">{t.segment} · {t.side}</div></td>
          <td>{t.qty}</td><td>{fmt(t.entry)}</td><td>{fmt(ltp)}</td>
          <td>{fmt(t.stop)} / {fmt(t.target)}</td>
          <td className={pnl >= 0 ? 'ok' : 'err'}>{fmt(pnl)}</td>
          <td><button className="mini" onClick={async () => { await apiPost(`/me/trade/${t.id}/close`); refresh() }}>Square off</button></td>
        </tr>
      })}</tbody>
    </table>
  )
}

// ── views ──
function Dashboard() {
  const { data, refresh } = useWallet()
  const [reco, setReco] = useState(null)
  useEffect(() => { apiGet('/recommendation').then(setReco).catch((e) => setReco({ answer: e.message })) }, [])
  return <>
    <h2>Dashboard</h2><div className="crumb">Your paper wallet & today's idea</div>
    <WalletPanel wallet={data} refresh={refresh} />
    <div className="panel"><h3>⭐ Today's best idea</h3>
      {reco ? <div className="answer">{reco.answer}</div> : <div className="mut">Loading…</div>}</div>
    <div className="panel"><h3>Open positions</h3><Positions trades={data?.open_trades} refresh={refresh} /></div>
    <div className="foot">Quantitative engines produce every number · the AI only summarizes · paper money only, no profit guarantee</div>
  </>
}

function TradeButtons({ msg }) { return msg ? <div className="crumb" style={{ marginTop: 8 }}>{msg}</div> : null }

function OptionsView({ sym }) {
  const { data, refresh } = useWallet()
  const candles = useCandles(sym)
  const [levels, setLevels] = useState(null)
  const [msg, setMsg] = useState('')
  async function take(leg) {
    setMsg('Placing…')
    try {
      const r = await apiPost('/me/trade', { segment: 'options', underlying: sym, leg })
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setLevels({ entry: t.entry, stop: t.stop, target: t.target })
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} ×${t.qty} (SL ${fmt(t.stop)} · TGT ${fmt(t.target)})`)
      refresh()
    } catch (e) { setMsg(e.message) }
  }
  return <>
    <h2>Options · {sym}</h2><div className="crumb">ATM weekly option — buy CE or PE</div>
    <div className="row">
      <button className="ce" onClick={() => take('CE')}>Buy {sym} CE (ATM)</button>
      <button className="pe" onClick={() => take('PE')}>Buy {sym} PE (ATM)</button>
    </div>
    <TradeButtons msg={msg} />
    <CandleChart candles={candles} levels={levels} title={`${sym} · 5m`} />
    <div className="panel"><h3>Open positions</h3><Positions trades={data?.open_trades} refresh={refresh} /></div>
  </>
}

function FuturesView() {
  const { data, refresh } = useWallet()
  const [sym, setSym] = useState('NIFTY')
  const candles = useCandles(sym)
  const [levels, setLevels] = useState(null)
  const [msg, setMsg] = useState('')
  async function take(side) {
    setMsg('Placing…')
    try {
      const r = await apiPost('/me/trade', { segment: 'futures', underlying: sym, side })
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setLevels({ entry: t.entry, stop: t.stop, target: t.target })
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} ×${t.qty}`); refresh()
    } catch (e) { setMsg(e.message) }
  }
  return <>
    <h2>Futures</h2><div className="crumb">Index futures (leveraged, ~15% SPAN margin)</div>
    <div className="row">
      <select value={sym} onChange={(e) => { setSym(e.target.value); setLevels(null) }}>
        <option>NIFTY</option><option>BANKNIFTY</option></select>
      <button className="ce" onClick={() => take('long')}>Go Long</button>
      <button className="pe" onClick={() => take('short')}>Go Short</button>
    </div>
    <TradeButtons msg={msg} />
    <CandleChart candles={candles} levels={levels} title={`${sym} · 5m`} />
    <div className="panel"><h3>Open positions</h3><Positions trades={data?.open_trades} refresh={refresh} /></div>
  </>
}

function EquityView() {
  const { data, refresh } = useWallet()
  const [sym, setSym] = useState('RELIANCE')
  const [qty, setQty] = useState('')
  const candles = useCandles(sym.toUpperCase().trim())
  const [levels, setLevels] = useState(null)
  const [msg, setMsg] = useState('')
  async function take(side) {
    const spec = { segment: 'equity', symbol: sym.toUpperCase().trim(), side }
    if (qty) spec.qty = Number(qty)
    setMsg('Placing…')
    try {
      const r = await apiPost('/me/trade', spec)
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setLevels({ entry: t.entry, stop: t.stop, target: t.target })
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} ×${t.qty}`); refresh()
    } catch (e) { setMsg(e.message) }
  }
  return <>
    <h2>Intraday Equity</h2><div className="crumb">Cash-segment intraday on a liquid stock</div>
    <div className="row">
      <input className="sm" value={sym} onChange={(e) => setSym(e.target.value)} placeholder="SYMBOL" />
      <input className="sm" type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="qty (auto)" />
      <button className="ce" onClick={() => take('long')}>Buy</button>
      <button className="pe" onClick={() => take('short')}>Short</button>
    </div>
    <TradeButtons msg={msg} />
    <CandleChart candles={candles} levels={levels} title={`${sym.toUpperCase()} · 5m`} />
    <div className="panel"><h3>Open positions</h3><Positions trades={data?.open_trades} refresh={refresh} /></div>
  </>
}

function RecoView() {
  const { data, refresh } = useWallet()
  const [reco, setReco] = useState(null)
  const [levels, setLevels] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { apiGet('/recommendation').then(setReco).catch((e) => setReco({ answer: e.message })) }, [])
  const candles = useCandles(reco?.chart_symbol)
  async function take() {
    if (!reco?.spec) return
    setMsg('Placing…')
    try {
      const r = await apiPost('/me/trade', reco.spec)
      if (r.error) { setMsg(r.error); return }
      const t = r.trade
      setLevels({ entry: t.entry, stop: t.stop, target: t.target })
      setMsg(`Opened ${t.symbol} @ ${fmt(t.entry)} ×${t.qty}`); refresh()
    } catch (e) { setMsg(e.message) }
  }
  return <>
    <h2>Best Recommendation</h2><div className="crumb">Today's single highest-conviction idea</div>
    {!reco ? <div className="mut">Computing today's best trade…</div> : <>
      <div className="answer">{reco.answer}</div>
      {reco.spec && <div className="row" style={{ marginTop: 10 }}><button onClick={take}>Take this trade</button></div>}
      <TradeButtons msg={msg} />
      <CandleChart candles={candles} levels={levels} title={reco.chart_symbol ? `${reco.chart_symbol} · 5m` : ''} />
    </>}
    <div className="panel"><h3>Open positions</h3><Positions trades={data?.open_trades} refresh={refresh} /></div>
  </>
}

function HistRow({ t }) {
  const [why, setWhy] = useState(t.ai_why || '')
  const [busy, setBusy] = useState(false)
  const closed = t.status !== 'open'
  async function explain() {
    setBusy(true); setWhy('Analyzing why this trade was taken…')
    try { const d = await apiPost(`/me/trade/${t.id}/explain`); setWhy(d.ai_why || d.error || '(no analysis)') }
    catch (e) { setWhy(e.message) } finally { setBusy(false) }
  }
  return <div className="histrow">
    <div className="hr-top">
      <div><b>{t.symbol}</b> <span className="mut">{t.segment} · {t.side}</span>{' '}
        <span className="tag">{closed ? (t.exit_reason || 'closed') : 'OPEN'}</span></div>
      <div className={closed ? (t.net_pnl >= 0 ? 'ok' : 'err') : 'mut'} style={{ fontWeight: 600 }}>
        {closed ? fmt(t.net_pnl) : 'live'}</div>
    </div>
    <div className="mut hr-detail">Entry {fmt(t.entry)} · SL {fmt(t.stop)} · TGT {fmt(t.target)}{
      closed ? ` · Exit ${fmt(t.exit_price)}` : ''} · Qty {t.qty}</div>
    {t.analysis && <div className="mut hr-detail">{t.analysis}</div>}
    <button className="mini" disabled={busy} onClick={explain} style={{ marginTop: 8 }}>🧠 Why this trade?</button>
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
    {!err && !trades && <div className="mut">Loading…</div>}
    {trades && !trades.length && <div className="mut">No trades yet — place one from a trade page.</div>}
    {trades && trades.length > 0 && (() => {
      const groups = {}
      trades.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t) })
      return Object.keys(groups).sort().reverse().map((date) => {
        const day = groups[date], closed = day.filter((t) => t.status !== 'open')
        const net = closed.reduce((s, t) => s + (t.net_pnl || 0), 0)
        return <div className="panel" key={date}>
          <h3>{date} <span className={net >= 0 ? 'ok' : 'err'} style={{ fontWeight: 500, fontSize: 13 }}>
            · {day.length} trade{day.length > 1 ? 's' : ''}, net {fmt(net)}</span></h3>
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
    {!err && !overview && <div className="mut">Loading…</div>}
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
      <button onClick={() => ask()} disabled={loading}>{loading ? '…' : 'Ask'}</button>
    </div>
    {loading && <div className="answer">Thinking… (first call can take a few seconds)</div>}
    {err && <div className="answer err">{err}</div>}
    {res && !loading && <>
      <div className="answer">{res.answer || '(no answer)'}</div>
      <div className="meta">intent: {res.intent || '-'}{res.symbol ? ' · ' + res.symbol : ''}</div>
      <details><summary>Show full data (JSON)</summary><pre>{JSON.stringify(res.data, null, 2)}</pre></details>
    </>}
  </>
}

// ── sidebar / shell / auth ──
const NAV = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { group: 'Trade' },
  { id: 'opt-NIFTY', label: '🟢 Options · NIFTY', sub: true },
  { id: 'opt-BANKNIFTY', label: '🔵 Options · BANKNIFTY', sub: true },
  { id: 'futures', label: '📈 Futures' },
  { id: 'equity', label: '🏦 Intraday Equity' },
  { id: 'reco', label: '⭐ Best Recommendation' },
  { id: 'ask', label: '💬 Ask AI' },
  { id: 'history', label: '📜 History' },
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

function Sidebar({ user, view, setView, onLogout }) {
  const [pwOpen, setPwOpen] = useState(false)
  return <aside className="sidebar">
    <div className="brand">Trading-AI<small>paper trading · not financial advice</small></div>
    <nav className="snav">
      {NAV.map((it, i) => it.group
        ? <div className="group-label" key={'g' + i}>{it.group}</div>
        : <div key={it.id} className={'snav-item' + (it.sub ? ' sub' : '') + (view === it.id ? ' active' : '')}
               onClick={() => setView(it.id)}>{it.label}</div>)}
      {user.role === 'admin' && <>
        <div className="group-label">Admin</div>
        <div className={'snav-item' + (view === 'admin' ? ' active' : '')} onClick={() => setView('admin')}>🛡️ All Users</div>
      </>}
    </nav>
    <div className="userbox">
      <b>{user.email}</b><span className="role">{user.role}</span>
      <button className="mini full" onClick={() => setPwOpen(!pwOpen)}>🔑 Change password</button>
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
  return <div className="authwrap">
    <form className="auth-card" onSubmit={submit}>
      <h1>📈 Trading-AI</h1>
      <div className="sub">{signup ? 'Create your paper-trading account' : 'Sign in to your paper-trading account'}</div>
      <label>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      <label>Password</label>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" minLength={6} required />
      <button className="primary" disabled={busy} >{busy ? '…' : (signup ? 'Sign up' : 'Log in')}</button>
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
  const [view, setView] = useState('dashboard')
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    setAuthFailHandler(() => setUser(null))
    if (getToken()) {
      apiGet('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setBooting(false))
    } else setBooting(false)
  }, [])

  const logout = () => { setToken(null); setUser(null) }

  if (booting) return <div className="authwrap"><div className="mut">Loading…</div></div>
  if (!user) return <AuthGate onAuth={(u) => { setUser(u); setView('dashboard') }} />

  return <div className="app">
    <Sidebar user={user} view={view} setView={setView} onLogout={logout} />
    <main className="main">
      {view === 'dashboard' && <Dashboard />}
      {view === 'opt-NIFTY' && <OptionsView sym="NIFTY" key="optn" />}
      {view === 'opt-BANKNIFTY' && <OptionsView sym="BANKNIFTY" key="optb" />}
      {view === 'futures' && <FuturesView />}
      {view === 'equity' && <EquityView />}
      {view === 'reco' && <RecoView />}
      {view === 'ask' && <AskView />}
      {view === 'history' && <HistoryView />}
      {view === 'admin' && <AdminView user={user} />}
    </main>
  </div>
}
