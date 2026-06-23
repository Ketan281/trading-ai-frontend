import { useState, useEffect } from 'react'
import { apiGet } from '../api'

const fmt = (n) => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const REGIME_COLORS = {
  'bullish': '#22c55e', 'strong_bullish': '#16a34a', 'Strong Bullish': '#16a34a',
  'bearish': '#ef4444', 'strong_bearish': '#dc2626', 'Strong Bearish': '#dc2626',
  'neutral': '#f59e0b', 'Neutral': '#f59e0b', 'Bullish': '#22c55e', 'Bearish': '#ef4444',
}

export default function RegimeStrip() {
  const [regime, setRegime] = useState(null)
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [r, w] = await Promise.all([
          apiGet('/phase2/regime').catch(() => null),
          apiGet('/me/wallet').catch(() => null),
        ])
        if (r) setRegime(r)
        if (w) setWallet(w)
      } catch {}
    }
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const macro = regime?.macro_regime || regime?.regime || '–'
  const dayType = regime?.day_type || '–'
  const color = REGIME_COLORS[macro] || '#9ca3af'

  const balance = wallet?.balance ?? wallet?.indian_wallet?.balance
  const pnl = wallet?.realized_pnl ?? wallet?.indian_wallet?.realized_pnl
  const pnlColor = (pnl || 0) >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px',
      background: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: 12,
      flexWrap: 'wrap', minHeight: 32,
    }}>
      {/* Balance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Balance</span>
        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{fmt(balance)}</span>
      </div>
      {pnl != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ opacity: 0.5 }}>P&L</span>
          <span style={{ fontWeight: 600, color: pnlColor }}>{fmt(pnl)}</span>
        </div>
      )}
      <div style={{ width: 1, height: 16, background: '#1e293b' }} />
      {/* Regime */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Regime</span>
        <span style={{ color, fontWeight: 600 }}>{macro}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Day</span>
        <span>{dayType.replace(/_/g, ' ')}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ opacity: 0.5 }}>Size</span>
        <span>{(regime?.sizing_multiplier || 1.0).toFixed(1)}x</span>
      </div>
    </div>
  )
}
