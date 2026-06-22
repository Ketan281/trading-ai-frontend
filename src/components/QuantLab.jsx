import { useState, useEffect } from 'react'
import { apiGet } from '../api'

export default function QuantLab() {
  const [tab, setTab] = useState('calibration')
  const [calibration, setCalibration] = useState(null)
  const [features, setFeatures] = useState(null)
  const [strategies, setStrategies] = useState(null)
  const [experiments, setExperiments] = useState([])
  const [stress, setStress] = useState(null)

  useEffect(() => {
    apiGet('/phase2/lab/calibration').then(setCalibration).catch(() => {})
    apiGet('/phase2/lab/experiments').then(d => setExperiments(d.experiments || [])).catch(() => {})
  }, [])

  const tabs = ['calibration', 'features', 'strategies', 'stress', 'experiments']

  return (
    <div style={{ padding: 16 }}>
      <h2>Research Lab</h2>
      <div className="crumb">Calibration, feature analysis, strategy comparison, and stress testing</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => {
            setTab(t)
            if (t === 'features' && !features) apiGet('/phase2/lab/features').then(setFeatures).catch(() => {})
            if (t === 'strategies' && !strategies) apiGet('/phase2/lab/strategies').then(setStrategies).catch(() => {})
          }} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: tab === t ? '#3b82f6' : '#1e293b', color: '#e2e8f0',
            fontSize: 12, fontWeight: tab === t ? 600 : 400,
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'calibration' && (
        <div>
          {calibration && (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="c" style={{ flex: 1 }}>
                  <div className="k">Overall</div>
                  <div className="v" style={{ textTransform: 'capitalize' }}>
                    {calibration.overall_calibration?.replace(/_/g, ' ') || '–'}
                  </div>
                </div>
                <div className="c" style={{ flex: 2 }}>
                  <div className="k">Recommendation</div>
                  <div className="v" style={{ fontSize: 12 }}>{calibration.recommendation || '–'}</div>
                </div>
              </div>

              {calibration.bins && calibration.bins.length > 0 && (
                <div className="c">
                  <div className="k">Calibration Bins</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {calibration.bins.map((b, i) => {
                      const barH = 80
                      const predH = b.predicted * barH
                      const actH = b.actual * barH
                      return (
                        <div key={i} style={{ textAlign: 'center', flex: '1 1 60px', minWidth: 60 }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4,
                            height: barH, alignItems: 'flex-end' }}>
                            <div style={{ width: 14, height: predH, background: '#3b82f6', borderRadius: 2 }}
                              title={`Predicted: ${(b.predicted * 100).toFixed(0)}%`} />
                            <div style={{ width: 14, height: actH, background: '#22c55e', borderRadius: 2 }}
                              title={`Actual: ${(b.actual * 100).toFixed(0)}%`} />
                          </div>
                          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.5 }}>{b.bin}</div>
                          <div style={{ fontSize: 10 }}>{b.trades}t</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 11 }}>
                    <span><span style={{ color: '#3b82f6' }}>■</span> Predicted</span>
                    <span><span style={{ color: '#22c55e' }}>■</span> Actual Win Rate</span>
                  </div>
                </div>
              )}
            </>
          )}
          {!calibration && <div className="c" style={{ textAlign: 'center', padding: 20 }}>Loading calibration...</div>}
        </div>
      )}

      {tab === 'features' && (
        <div>
          {features?.features && features.features.length > 0 ? (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ opacity: 0.5 }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Feature</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>WR With</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>WR Without</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>Lift</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>Avg R With</th>
                </tr>
              </thead>
              <tbody>
                {features.features.map((f, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ padding: 4, fontWeight: 600 }}>{f.feature.replace(/_/g, ' ')}</td>
                    <td style={{ padding: 4, textAlign: 'right' }}>{(f.win_rate_with * 100).toFixed(0)}%</td>
                    <td style={{ padding: 4, textAlign: 'right' }}>{(f.win_rate_without * 100).toFixed(0)}%</td>
                    <td style={{ padding: 4, textAlign: 'right',
                      color: f.lift > 0 ? '#22c55e' : '#ef4444' }}>
                      {f.lift > 0 ? '+' : ''}{(f.lift * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: 4, textAlign: 'right' }}>{f.avg_r_with?.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="c" style={{ textAlign: 'center', padding: 20 }}>
              {features ? 'No feature data yet' : 'Loading features...'}
            </div>
          )}
        </div>
      )}

      {tab === 'strategies' && (
        <div>
          {strategies?.strategies && strategies.strategies.length > 0 ? (
            strategies.strategies.map((s, i) => (
              <div key={i} className="c" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s.strategy}</span>
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{s.trades} trades</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span>WR: {(s.win_rate * 100).toFixed(0)}%</span>
                  <span>PF: {s.profit_factor?.toFixed(2)}</span>
                  <span>Avg R: {s.avg_r?.toFixed(3)}</span>
                  <span style={{ color: s.total_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    P&L: ₹{s.total_pnl?.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="c" style={{ textAlign: 'center', padding: 20 }}>
              {strategies ? 'No strategy data yet' : 'Loading strategies...'}
            </div>
          )}
        </div>
      )}

      {tab === 'stress' && (
        <StressTab stress={stress} setStress={setStress} />
      )}

      {tab === 'experiments' && (
        <div>
          {experiments.length === 0 ? (
            <div className="c" style={{ textAlign: 'center', padding: 20 }}>No experiments yet</div>
          ) : (
            experiments.map((e, i) => (
              <div key={i} className="c" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: e.status === 'concluded' ? '#22c55e22' : '#f59e0b22',
                    color: e.status === 'concluded' ? '#22c55e' : '#f59e0b' }}>
                    {e.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{e.hypothesis}</div>
                {e.winner && (
                  <div style={{ fontSize: 12, marginTop: 4, color: '#22c55e' }}>Winner: Variant {e.winner.toUpperCase()}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function StressTab({ stress, setStress }) {
  const scenarios = ['2020_crash', '2022_bear', '2018_correction', 'flash_crash']
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async (sc) => {
    setSelected(sc)
    setLoading(true)
    try {
      const d = await apiGet(`/phase2/lab/stress/${sc}`)
      setStress(d)
    } catch {}
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {scenarios.map(sc => (
          <button key={sc} onClick={() => run(sc)} style={{
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            border: selected === sc ? '1px solid #3b82f6' : '1px solid #334155',
            background: selected === sc ? '#3b82f622' : 'transparent',
            color: '#e2e8f0',
          }}>
            {sc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {loading && <div className="c" style={{ textAlign: 'center', padding: 20 }}>Running stress test...</div>}

      {!loading && stress && !stress.error && (
        <div>
          <div className="c" style={{ marginBottom: 16 }}>
            <div className="k">{stress.scenario}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
              <span>Market DD: {stress.market_drawdown}</span>
              <span>VIX: {stress.vix_spike_to}</span>
              <span>Duration: {stress.duration_days}d</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div className="c" style={{ flex: 1 }}>
              <div className="k">Current Exposure</div>
              <div className="v">{stress.current_exposure?.positions || 0} positions</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {((stress.current_exposure?.gross_pct || 0) * 100).toFixed(1)}% gross
              </div>
            </div>
            <div className="c" style={{ flex: 1 }}>
              <div className="k">Estimated Loss</div>
              <div className="v" style={{ color: '#ef4444' }}>
                ₹{stress.estimated_impact?.estimated_loss?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {stress.estimated_impact?.loss_pct?.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="c" style={{
            borderLeft: `3px solid ${stress.estimated_impact?.would_trigger_halt ? '#ef4444' :
              stress.estimated_impact?.would_trigger_restricted ? '#f59e0b' : '#22c55e'}`
          }}>
            <div className="v" style={{ fontSize: 13 }}>{stress.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  )
}
