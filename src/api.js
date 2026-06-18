// Central API base — override at build time with VITE_API_URL.
export const API = import.meta.env.VITE_API_URL || 'https://ketan-trading.duckdns.org'

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}
