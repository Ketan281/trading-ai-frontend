// Dependency-free SVG candlestick chart (matches the project's no-chart-lib
// style). Plots OHLC candles and optional entry / stop / target price lines.
const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function CandleChart({ candles, levels, title }) {
  if (!candles || candles.length < 2)
    return <div className="chart empty">No candle data yet (market closed or still loading)…</div>

  const W = 760, H = 340, padL = 6, padR = 64, padT = 14, padB = 18
  const lvl = levels || {}
  const prices = candles.flatMap((c) => [c.high, c.low])
  for (const k of ['entry', 'stop', 'target']) if (lvl[k]) prices.push(lvl[k])
  let lo = Math.min(...prices), hi = Math.max(...prices)
  const padP = (hi - lo) * 0.05 || 1
  lo -= padP; hi += padP
  const span = hi - lo || 1

  const n = candles.length
  const cw = (W - padL - padR) / n
  const x = (i) => padL + i * cw + cw / 2
  const y = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB)
  const bodyW = Math.max(1, Math.min(cw * 0.62, 10))

  const gridVals = [lo + span * 0.2, lo + span * 0.5, lo + span * 0.8]
  const levelColors = { entry: '#3b82f6', stop: '#ef4444', target: '#22c55e' }

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
      {gridVals.map((v, i) => (
        <g key={'g' + i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#1c2738" strokeWidth="1" />
          <text x={W - padR + 4} y={y(v) + 3} fill="#5b6677" fontSize="10">{fmt(v)}</text>
        </g>
      ))}

      {candles.map((c, i) => {
        const up = c.close >= c.open
        const col = up ? '#22c55e' : '#ef4444'
        const yO = y(c.open), yC = y(c.close)
        const top = Math.min(yO, yC)
        const bh = Math.max(1, Math.abs(yC - yO))
        return (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={col} strokeWidth="1" />
            <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={bh} fill={col} />
          </g>
        )
      })}

      {['entry', 'stop', 'target'].map((k) => lvl[k] ? (
        <g key={k}>
          <line x1={padL} x2={W - padR} y1={y(lvl[k])} y2={y(lvl[k])}
                stroke={levelColors[k]} strokeWidth="1" strokeDasharray="5 3" />
          <text x={W - padR + 4} y={y(lvl[k]) + 3} fill={levelColors[k]} fontSize="10" fontWeight="600">
            {k} {fmt(lvl[k])}
          </text>
        </g>
      ) : null)}

      {title && <text x={padL + 2} y={12} fill="#8b97a8" fontSize="11">{title}</text>}
    </svg>
  )
}
