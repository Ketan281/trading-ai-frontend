import { useState } from 'react'

// API base — override at build time with VITE_API_URL (see .env.example)
const API = import.meta.env.VITE_API_URL || 'https://ketan-trading.duckdns.org'

const EXAMPLES = [
  'best banknifty intraday option today',
  'nifty options view',
  'best stocks to buy for swing',
  'build me a portfolio book',
]

function Card({ k, v }) {
  return (
    <div className="c">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  )
}

export default function App() {
  const [q, setQ] = useState('best banknifty intraday option today')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')

  async function ask(query) {
    const text = (query ?? q).trim()
    if (!text) return
    setLoading(true); setErr(''); setRes(null)
    try {
      const r = await fetch(`${API}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, polish: false }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setRes(await r.json())
    } catch (e) {
      setErr(e.message || 'request failed')
    } finally {
      setLoading(false)
    }
  }

  const cards = []
  const d = res?.data || {}
  const s = d.structure || d.recommended_structure
  if (d.prob_up != null) cards.push(['P(up)', d.prob_up])
  if (d.action) cards.push(['Action', d.action])
  if (s?.kind) cards.push(['Structure', s.kind.replaceAll('_', ' ')])
  if (s?.breakevens) cards.push(['Breakevens', JSON.stringify(s.breakevens)])
  if (s?.max_loss_rupees != null) cards.push(['Max loss', '₹' + s.max_loss_rupees])
  if (d.intraday_regime?.regime) cards.push(['Intraday regime', d.intraday_regime.regime])
  if (Array.isArray(d.actionable)) cards.push(['Actionable', d.actionable.length])

  return (
    <div className="wrap">
      <h1>📈 Trading-AI</h1>
      <div className="sub">
        NSE equities + NIFTY/BANKNIFTY options intelligence · paper-trading only · not financial advice
      </div>

      <div className="box">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="e.g. best banknifty intraday option today"
        />
        <button onClick={() => ask()} disabled={loading}>
          {loading ? '…' : 'Ask'}
        </button>
      </div>

      <div className="chips">
        {EXAMPLES.map((e) => (
          <span key={e} className="chip" onClick={() => { setQ(e); ask(e) }}>
            {e}
          </span>
        ))}
      </div>

      {loading && <div className="answer">Thinking… (first call can take a few seconds)</div>}

      {err && (
        <div className="answer err">
          Couldn't reach the API: {err}.<br />
          Check the API is up and <code>ALLOWED_ORIGINS</code> includes this site.
        </div>
      )}

      {res && !loading && (
        <>
          <div className="answer">{res.answer || '(no answer)'}</div>
          <div className="meta">
            intent: {res.intent || '-'}{res.symbol ? ' · ' + res.symbol : ''}
          </div>
          {cards.length > 0 && (
            <div className="cards">
              {cards.map(([k, v]) => <Card key={k} k={k} v={String(v)} />)}
            </div>
          )}
          <details>
            <summary>Show full data (JSON)</summary>
            <pre>{JSON.stringify(res.data, null, 2)}</pre>
          </details>
        </>
      )}

      <div className="foot">
        Quantitative engines produce every number · the AI only summarizes · paper mode
      </div>
    </div>
  )
}
