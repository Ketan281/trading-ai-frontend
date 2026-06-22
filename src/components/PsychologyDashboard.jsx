import { useState, useEffect } from 'react'
import { apiGet } from '../api'

const STATE_COLORS = {
  normal: '#22c55e', caution: '#f59e0b', restricted: '#f97316', halt: '#ef4444',
}

export default function PsychologyDashboard() {
  const [data, setData] = useState(null)
  const [events, setEvents] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [psy, ev] = await Promise.all([
          apiGet('/phase2/psychology'),
          apiGet('/phase2/psychology/events?limit=20'),
        ])
        setData(psy)
        setEvents(ev.events || [])
        setErr(null)
      } catch (e) { setErr(e.message) }
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  if (err) return <div className="answer" style={{ color: '#ef4444' }}>Psychology: {err}</div>
  if (!data) return <div className="answer">Loading psychology state...</div>

  const s = data.state || {}
  const rs = data.risk_state || s.risk_state || 'unknown'
  const color = STATE_COLORS[rs] || '#9ca3af'

  const bars = [
    { label: 'Daily Loss', val: Math.abs(s.daily_loss_pct || 0), max: 2, unit: '%' },
    { label: 'Weekly Loss', val: Math.abs(s.weekly_loss_pct || 0), max: 4, unit: '%' },
    { label: 'Monthly Loss', val: Math.abs(s.monthly_loss_pct || 0), max: 8, unit: '%' },
    { label: 'Trades Today', val: s.trades_today || 0, max: 5, unit: '' },
    { label: 'Consec. Losses', val: s.consecutive_losses || 0, max: 3, unit: '' },
  ]

  return (
    <div style={{ padding: 16 }}>
      <h2>Risk & Psychology</h2>
      <div className="crumb">Behavioral gate — loss limits, cooldowns, and discipline tracking</div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="c" style={{ flex: 1, minWidth: 150 }}>
          <div className="k">Risk State</div>
          <div className="v" style={{ color, fontSize: 22, fontWeight: 700, textTransform: 'uppercase' }}>
            {rs}
          </div>
        </div>
        <div className="c" style={{ flex: 1, minWidth: 150 }}>
          <div className="k">Psychology Score</div>
          <div className="v" style={{ fontSize: 22, fontWeight: 700 }}>
            {(s.psychology_score ?? 100).toFixed(0)}/100
          </div>
        </div>
        <div className="c" style={{ flex: 1, minWidth: 150 }}>
          <div className="k">Discipline Score</div>
          <div className="v" style={{ fontSize: 22, fontWeight: 700 }}>
            {(s.discipline_score ?? 100).toFixed(0)}/100
          </div>
        </div>
      </div>

      <div className="c" style={{ marginBottom: 16 }}>
        <div className="k">Limits Usage</div>
        <div style={{ marginTop: 8 }}>
          {bars.map(b => {
            const pct = Math.min((b.val / b.max) * 100, 100)
            const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e'
            return (
              <div key={b.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span>{b.label}</span>
                  <span>{b.val}{b.unit} / {b.max}{b.unit}</span>
                </div>
                <div style={{ background: '#1e293b', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', background: barColor, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {s.cooldown_until && (
        <div className="c" style={{ marginBottom: 16, borderColor: '#f59e0b' }}>
          <div className="k" style={{ color: '#f59e0b' }}>Cooldown Active</div>
          <div className="v">Until {new Date(s.cooldown_until).toLocaleTimeString()}</div>
        </div>
      )}

      {events.length > 0 && (
        <div className="c">
          <div className="k">Recent Events</div>
          <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ opacity: 0.6 }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Time</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Event</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ padding: 4, whiteSpace: 'nowrap' }}>
                      {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '–'}
                    </td>
                    <td style={{ padding: 4, color: e.event_type?.includes('halt') ? '#ef4444' : '#f59e0b' }}>
                      {(e.event_type || '').replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: 4, opacity: 0.7 }}>{e.detail || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
