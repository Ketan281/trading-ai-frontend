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

export default function RegimeStrip() {
  const [regime, setRegime] = useState(null)
  const [psych, setPsych] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [r, p] = await Promise.all([
          apiGet('/phase2/regime'),
          apiGet('/phase2/psychology'),
        ])
        setRegime(r)
        setPsych(p)
      } catch {}
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  if (!regime) return null

  const macro = regime.macro_regime || regime.regime || '–'
  const dayType = regime.day_type || '–'
  const color = REGIME_COLORS[macro] || '#9ca3af'
  const icon = DAY_TYPE_ICONS[dayType] || '📊'
  const riskState = psych?.risk_state || psych?.state?.risk_state || 'normal'
  const riskColor = { normal: '#22c55e', caution: '#f59e0b', restricted: '#f97316', halt: '#ef4444' }[riskState] || '#9ca3af'
  const psychScore = psych?.state?.psychology_score ?? 100

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px',
      background: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: 12,
      flexWrap: 'wrap', minHeight: 32,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Regime</span>
        <span style={{ color, fontWeight: 600 }}>{macro}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Day</span>
        <span>{icon} {dayType.replace(/_/g, ' ')}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Size</span>
        <span>{(regime.sizing_multiplier || 1.0).toFixed(1)}x</span>
      </div>
      <div style={{ width: 1, height: 16, background: '#1e293b' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, display: 'inline-block' }} />
        <span style={{ color: riskColor, fontWeight: 600, textTransform: 'uppercase' }}>{riskState}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Psych</span>
        <span>{psychScore}/100</span>
      </div>
    </div>
  )
}
