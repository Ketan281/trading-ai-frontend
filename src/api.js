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

// ── GET cache + in-flight de-duplication ───────────────────────────────────
// The backend is a single worker on a 1GB box. The UI mounts ~6 components that
// each poll the same endpoints, and switching tabs remounts them — without this
// layer that's a burst of duplicate requests every interaction, which is what
// makes the app feel like it "reloads everything" and contributes to 504s.
//
//   • In-flight de-dup: N concurrent GETs to the same path share ONE request.
//   • TTL cache: a repeat GET within `ttl` ms returns the last value instantly
//     (no network), so revisiting a tab is free.
//   • Any successful POST/DELETE clears the cache so the next GET is fresh —
//     placing/closing a trade, depositing, changing mode all reflect at once.
const _cache = new Map()      // path -> { ts, data }
const _inflight = new Map()   // path -> Promise
const DEFAULT_TTL = 30000     // 30s — matches the slow server-side caches

export function clearApiCache(prefix) {
  if (!prefix) { _cache.clear(); return }
  for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k)
}

async function cachedGet(path, { ttl = DEFAULT_TTL, force = false, auth = true } = {}) {
  const now = Date.now()
  if (!force && ttl > 0) {
    const hit = _cache.get(path)
    if (hit && now - hit.ts < ttl) return hit.data
  }
  // Coalesce concurrent callers onto a single network request.
  if (_inflight.has(path)) return _inflight.get(path)

  const p = req(path, { auth })
    .then((data) => {
      if (ttl > 0) _cache.set(path, { ts: Date.now(), data })
      return data
    })
    .finally(() => { _inflight.delete(path) })

  _inflight.set(path, p)
  return p
}

// apiGet(path)                       → cached (30s) + de-duped
// apiGet(path, { force: true })      → bypass cache (e.g. manual refresh)
// apiGet(path, { ttl: 0 })           → never cache this call
// apiGet(path, { ttl: 120000 })      → custom freshness window
export const apiGet = (path, opts) => cachedGet(path, opts)

export const apiPost = (path, body, opts) =>
  req(path, { method: 'POST', body, ...opts }).then((d) => { clearApiCache(); return d })

export const apiDelete = (path, opts) =>
  req(path, { method: 'DELETE', ...opts }).then((d) => { clearApiCache(); return d })
