import { useState } from 'react'

function Section({ title, items, color }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: color || '#94a3b8', marginBottom: 4 }}>{title}</div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 12, padding: '2px 0', opacity: 0.8 }}>• {item}</div>
      ))}
    </div>
  )
}

function ReadBlock({ label, text }) {
  if (!text) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }}>{label}:</span>{' '}
      <span style={{ fontSize: 12 }}>{text}</span>
    </div>
  )
}

export default function TradeExplainer({ rec, onClose }) {
  if (!rec) return null
  const ex = rec.explanation || {}
  const gd = rec.grade_detail || {}
  const qd = rec.quality_detail || {}

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 999, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
        maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 20,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            {rec.grade === 'NO_TRADE' ? 'Why No Trade' : 'Why This Trade'}: {rec.symbol}
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#94a3b8',
            fontSize: 18, cursor: 'pointer',
          }}>✕</button>
        </div>

        {ex.summary && (
          <div className="c" style={{ marginBottom: 16 }}>
            <div className="v" style={{ fontSize: 13 }}>{ex.summary}</div>
          </div>
        )}

        {rec.grade === 'NO_TRADE' ? (
          <>
            <Section title="Reasons" items={ex.specific_reasons} color="#ef4444" />
            {ex.what_would_make_it_tradeable && (
              <div className="c" style={{ marginBottom: 12 }}>
                <div className="k">What Would Make It Tradeable</div>
                <div className="v" style={{ fontSize: 12 }}>
                  {Array.isArray(ex.what_would_make_it_tradeable)
                    ? ex.what_would_make_it_tradeable.join(' · ')
                    : ex.what_would_make_it_tradeable}
                </div>
              </div>
            )}
            {gd.disqualifiers && gd.disqualifiers.length > 0 && (
              <Section title="Disqualifiers" items={gd.disqualifiers} color="#ef4444" />
            )}
          </>
        ) : (
          <>
            <Section title="Bullish Factors" items={ex.bullish_factors} color="#22c55e" />
            <Section title="Bearish Factors" items={ex.bearish_factors} color="#ef4444" />
            <Section title="Neutral Factors" items={ex.neutral_factors} color="#f59e0b" />

            <div className="c" style={{ marginBottom: 12 }}>
              <div className="k">Market Reads</div>
              <div style={{ marginTop: 8 }}>
                <ReadBlock label="Regime" text={ex.regime_read} />
                <ReadBlock label="Breadth" text={ex.breadth_read} />
                <ReadBlock label="RS" text={ex.rs_read} />
                <ReadBlock label="Sector" text={ex.sector_read} />
                <ReadBlock label="Options Flow" text={ex.options_flow_read} />
                <ReadBlock label="MTF" text={ex.mtf_read} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {ex.sizing_logic && (
                <div className="c" style={{ flex: 1, minWidth: 150 }}>
                  <div className="k">Sizing</div>
                  <div className="v" style={{ fontSize: 12 }}>{ex.sizing_logic}</div>
                </div>
              )}
              {ex.stop_logic && (
                <div className="c" style={{ flex: 1, minWidth: 150 }}>
                  <div className="k">Stop Logic</div>
                  <div className="v" style={{ fontSize: 12 }}>{ex.stop_logic}</div>
                </div>
              )}
              {ex.target_logic && (
                <div className="c" style={{ flex: 1, minWidth: 150 }}>
                  <div className="k">Target Logic</div>
                  <div className="v" style={{ fontSize: 12 }}>{ex.target_logic}</div>
                </div>
              )}
            </div>

            <Section title="Risk Factors" items={ex.risk_factors} color="#f97316" />
            <Section title="What Could Go Wrong" items={ex.what_could_go_wrong} color="#ef4444" />
          </>
        )}

        {gd.sub_scores && (
          <div className="c" style={{ marginTop: 12 }}>
            <div className="k">Grade Breakdown</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {Object.entries(gd.sub_scores).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4,
                  background: v > 60 ? '#22c55e15' : v > 40 ? '#f59e0b15' : '#ef444415' }}>
                  {k}: <strong>{typeof v === 'number' ? v.toFixed(0) : v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {qd.component_scores && Object.keys(qd.component_scores).length > 0 && (
          <div className="c" style={{ marginTop: 12 }}>
            <div className="k">Quality Components</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {Object.entries(qd.component_scores).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4,
                  background: '#1e293b' }}>
                  {k}: <strong>{typeof v === 'number' ? v.toFixed(0) : v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
