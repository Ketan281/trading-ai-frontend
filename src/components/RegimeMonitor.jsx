import { useState, useEffect } from 'react'
import { apiGet } from '../api'

const REGIME_COLORS = {
  'bullish': '#22c55e', 'strong_bullish': '#16a34a', 'Strong Bullish': '#16a34a',
  'bearish': '#ef4444', 'strong_bearish': '#dc2626', 'Strong Bearish': '#dc2626',
  'neutral': '#f59e0b', 'Neutral': '#f59e0b', 'Bullish': '#22c55e', 'Bearish': '#ef4444',
}

const DAY_TYPE_ICONS = {
  trend_day: '📈', range_day: '↔️', breakout_day: '🚀', mean_reversion_day: '🔄',
  vol_expansion: '💥', vol_contraction: '🤏', panic_selling: '🔴',
  short_covering_rally: '🟢', risk_on: '✅', risk_off: '⛔',
}

export default function RegimeMonitor() {
  const [regime, setRegime] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const d = await apiGet('/phase2/regime')
        setRegime(d)
        setErr(null)
      } catch (e) { setErr(e.message) }
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  if (err) return <div className="answer" style={{ color: '#ef4444' }}>Regime: {err}</div>
  if (!regime) return <div className="answer">Loading regime...</div>

  const macro = regime.macro_regime || regime.regime || '?'
  const dayType = regime.day_type || '?'
  const color = REGIME_COLORS[macro] || '#9ca3af'
  const icon = DAY_TYPE_ICONS[dayType] || '📊'
  const playbook = regime.playbook || regime.strategy_adaptation?.playbook || ''
  const allowed = regime.allowed_strategies || []
  const forbidden = regime.forbidden_strategies || []

  return (
    <div style={{ padding: 16 }}>
      <h2>Market Regime</h2>
      <div className="crumb">Day-type classification, strategy adaptation, and allowed playbook</div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="c" style={{ flex: 1, minWidth: 200 }}>
          <div className="k">Macro Regime</div>
          <div className="v" style={{ color, fontSize: 20, fontWeight: 700 }}>{macro}</div>
        </div>
        <div className="c" style={{ flex: 1, minWidth: 200 }}>
          <div className="k">Day Type</div>
          <div className="v" style={{ fontSize: 20 }}>{icon} {dayType.replace(/_/g, ' ')}</div>
        </div>
        <div className="c" style={{ flex: 1, minWidth: 200 }}>
          <div className="k">Sizing Multiplier</div>
          <div className="v">{(regime.sizing_multiplier || 1.0).toFixed(2)}x</div>
        </div>
      </div>

      {playbook && (
        <div className="c" style={{ marginBottom: 16 }}>
          <div className="k">Playbook</div>
          <div className="v" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{playbook}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {allowed.length > 0 && (
          <div className="c" style={{ flex: 1, minWidth: 200 }}>
            <div className="k">Allowed Strategies</div>
            <div className="v" style={{ fontSize: 13 }}>
              {allowed.map((s, i) => (
                <span key={i} style={{ display: 'inline-block', background: '#22c55e22',
                  color: '#22c55e', padding: '2px 8px', borderRadius: 4, margin: 2, fontSize: 11 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {forbidden.length > 0 && (
          <div className="c" style={{ flex: 1, minWidth: 200 }}>
            <div className="k">Forbidden</div>
            <div className="v" style={{ fontSize: 13 }}>
              {forbidden.map((s, i) => (
                <span key={i} style={{ display: 'inline-block', background: '#ef444422',
                  color: '#ef4444', padding: '2px 8px', borderRadius: 4, margin: 2, fontSize: 11 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {regime.all_scores && (
        <div className="c" style={{ marginTop: 16 }}>
          <div className="k">Day Type Scores</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {Object.entries(regime.all_scores).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} style={{ background: v > 50 ? '#22c55e15' : '#1e293b',
                padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>
                <span style={{ opacity: 0.6 }}>{k.replace(/_/g, ' ')}</span>{' '}
                <span style={{ fontWeight: 600 }}>{v.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
