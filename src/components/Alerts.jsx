import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../api'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/portfolio/alerts' + (filter === 'unread' ? '?unread_only=true' : ''))
      setAlerts(d.alerts || [])
    } catch { /* keep last */ }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function markAllRead() {
    try { await apiPost('/portfolio/alerts/read', {}); load() }
    catch (e) { alert(e.message) }
  }

  const unread = alerts.filter(a => !a.read).length

  return (
    <div>
      <h2>Alerts</h2>
      <div className="crumb">
        Portfolio notifications and risk warnings
        {unread > 0 && <span className="alert-badge">{unread} unread</span>}
      </div>

      <div className="row" style={{ marginBottom: 16, gap: 8 }}>
        <button className={'tab' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>All</button>
        <button className={'tab' + (filter === 'unread' ? ' on' : '')} onClick={() => setFilter('unread')}>Unread</button>
        {unread > 0 && <button className="mini" onClick={markAllRead}>Mark all read</button>}
      </div>

      {loading && <div className="mut">Loading alerts...</div>}

      {!loading && alerts.length === 0 && (
        <div className="panel"><div className="mut">No alerts yet. Alerts appear when trades are opened/closed or risk limits are approached.</div></div>
      )}

      {alerts.map(a => (
        <div key={a.id} className={'alert-item ' + a.severity + (a.read ? ' read' : '')}>
          <div className="alert-header">
            <span className={'alert-severity ' + a.severity}>{a.severity}</span>
            <span className="alert-type">{a.alert_type}</span>
            <span className="alert-time">{new Date(a.created_at).toLocaleString()}</span>
          </div>
          <div className="alert-title">{a.title}</div>
          {a.message && <div className="alert-message">{a.message}</div>}
        </div>
      ))}
    </div>
  )
}
