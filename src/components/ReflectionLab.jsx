import { useState, useEffect } from 'react'
import { apiGet } from '../api'

const fmt = n => n == null ? '–' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function ReflectionLab() {
  const [tab, setTab] = useState('journal')
  const [journal, setJournal] = useState([])
  const [weekly, setWeekly] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [learning, setLearning] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    apiGet('/phase2/journal?limit=30').then(d => setJournal(d.journal || [])).catch(() => {})
    apiGet('/phase2/reflection/weekly').then(setWeekly).catch(() => {})
  }, [])

  const loadMonthly = () => { if (!monthly) apiGet('/phase2/reflection/monthly').then(setMonthly).catch(() => {}) }
  const loadLearning = () => { if (!learning) apiGet('/phase2/reflection/learning').then(setLearning).catch(() => {}) }

  const tabs = ['journal', 'weekly', 'monthly', 'learning']

  return (
    <div style={{ padding: 16 }}>
      <h2>Trade Journal</h2>
      <div className="crumb">Complete trade history, weekly/monthly reports, and self-learning feedback</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => {
            setTab(t)
            if (t === 'monthly') loadMonthly()
            if (t === 'learning') loadLearning()
          }} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: tab === t ? '#3b82f6' : '#1e293b', color: '#e2e8f0',
            fontSize: 12, fontWeight: tab === t ? 600 : 400,
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'journal' && (
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {journal.length === 0 ? (
            <div className="c" style={{ textAlign: 'center', padding: 20 }}>No journal entries yet</div>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ opacity: 0.5 }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Symbol</th>
                  <th style={{ padding: 4 }}>Grade</th>
                  <th style={{ padding: 4 }}>Regime</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>P&L</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>R</th>
                  <th style={{ padding: 4 }}>Exit</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((j, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ padding: 4, fontWeight: 600 }}>{j.symbol}</td>
                    <td style={{ padding: 4, textAlign: 'center' }}>{j.grade || '–'}</td>
                    <td style={{ padding: 4, textAlign: 'center', fontSize: 11 }}>{j.regime || '–'}</td>
                    <td style={{ padding: 4, textAlign: 'right',
                      color: (j.pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {fmt(j.pnl)}
                    </td>
                    <td style={{ padding: 4, textAlign: 'right' }}>
                      {j.r_multiple != null ? j.r_multiple.toFixed(2) : '–'}
                    </td>
                    <td style={{ padding: 4, opacity: 0.6 }}>{j.exit_reason || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'weekly' && weekly && (
        <ReportView report={weekly} type="weekly" />
      )}

      {tab === 'monthly' && monthly && (
        <ReportView report={monthly} type="monthly" />
      )}

      {tab === 'learning' && learning && (
        <div>
          <div className="c" style={{ marginBottom: 16 }}>
            <div className="k">Total Trades Analyzed</div>
            <div className="v" style={{ fontSize: 20 }}>{learning.total_trades || 0}</div>
          </div>

          {learning.highest_expectancy_conditions && Object.keys(learning.highest_expectancy_conditions).length > 0 && (
            <div className="c" style={{ marginBottom: 16 }}>
              <div className="k">Best Conditions</div>
              {Object.entries(learning.highest_expectancy_conditions).map(([k, v]) => (
                <div key={k} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ fontWeight: 600 }}>{k}</span>
                  <span style={{ marginLeft: 12, opacity: 0.6 }}>
                    WR: {(v.win_rate * 100).toFixed(0)}% · Avg R: {v.avg_r?.toFixed(2)} · {v.trades} trades
                  </span>
                </div>
              ))}
            </div>
          )}

          {learning.recommended_filters && learning.recommended_filters.length > 0 && (
            <div className="c">
              <div className="k" style={{ color: '#ef4444' }}>Recommended Filters</div>
              {learning.recommended_filters.map((f, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0' }}>• {f}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportView({ report, type }) {
  if (!report) return null
  const scores = [
    ['Trades', report.total_trades || report.trades],
    ['Win Rate', ((report.win_rate || 0) * 100).toFixed(0) + '%'],
    ['Profit Factor', (report.profit_factor || 0).toFixed(2)],
    ['Avg R', (report.avg_r || 0).toFixed(3)],
    ['Total P&L', fmt(report.total_pnl)],
    ['Reflection', (report.reflection_score || 0).toFixed(0)],
    ['Edge', (report.edge_score || 0).toFixed(0)],
  ]

  return (
    <div>
      <div className="c" style={{ marginBottom: 12 }}>
        <div className="k">{type === 'weekly' ? 'Period' : 'Month'}</div>
        <div className="v">{report.period}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {scores.map(([k, v]) => (
          <div key={k} className="c" style={{ flex: '1 1 100px', minWidth: 80 }}>
            <div className="k">{k}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>

      {report.grade_performance && Object.keys(report.grade_performance).length > 0 && (
        <div className="c" style={{ marginBottom: 12 }}>
          <div className="k">Grade Performance</div>
          {Object.entries(report.grade_performance).map(([g, s]) => (
            <div key={g} style={{ fontSize: 12, padding: '4px 0', display: 'flex', gap: 16 }}>
              <span style={{ fontWeight: 600, width: 30 }}>{g}</span>
              <span>WR: {((s.win_rate || 0) * 100).toFixed(0)}%</span>
              <span>PF: {(s.profit_factor || 0).toFixed(1)}</span>
              <span>{s.trades} trades</span>
            </div>
          ))}
        </div>
      )}

      {report.recommendations && report.recommendations.length > 0 && (
        <div className="c">
          <div className="k">Recommendations</div>
          {report.recommendations.map((r, i) => (
            <div key={i} style={{ fontSize: 12, padding: '4px 0' }}>• {r}</div>
          ))}
        </div>
      )}

      {report.confidence_calibration && report.confidence_calibration.length > 0 && (
        <div className="c" style={{ marginTop: 12 }}>
          <div className="k">Confidence Calibration</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {report.confidence_calibration.map((b, i) => (
              <div key={i} style={{ background: '#1e293b', padding: '6px 10px', borderRadius: 6, fontSize: 11 }}>
                <div style={{ opacity: 0.5 }}>{b.bin}</div>
                <div>Pred: {(b.predicted_avg * 100).toFixed(0)}%</div>
                <div>Actual: {(b.actual_win_rate * 100).toFixed(0)}%</div>
                <div style={{ color: b.gap > 0.05 ? '#ef4444' : b.gap < -0.05 ? '#22c55e' : '#9ca3af' }}>
                  Gap: {(b.gap * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
