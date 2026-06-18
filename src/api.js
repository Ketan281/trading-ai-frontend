// Central API client — auth-aware (JWT bearer) with a dev-friendly base.
//
// Base URL: VITE_API_URL wins; otherwise localhost dev hits the local backend
// on :8000, and a deployed build falls back to the public host.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
export const API =
  import.meta.env.VITE_API_URL ||
  (isLocal ? 'http://127.0.0.1:8000' : 'https://ketan-trading.duckdns.org')

// ── token storage ──
const TOKEN_KEY = 'ta_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

// App registers a callback so a 401 anywhere bounces back to the login screen.
let _onAuthFail = () => {}
export const setAuthFailHandler = (fn) => { _onAuthFail = fn }

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const tok = getToken()
  if (auth && tok) headers.Authorization = 'Bearer ' + tok
  const r = await fetch(`${API}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json().catch(() => ({}))
  if (r.status === 401 && auth && tok) {
    setToken(null); _onAuthFail()
    throw new Error('session expired — please log in')
  }
  if (!r.ok) throw new Error(d.detail || d.error || `HTTP ${r.status}`)
  return d
}

export const apiGet = (path, opts) => req(path, { ...opts })
export const apiPost = (path, body, opts) => req(path, { method: 'POST', body, ...opts })
