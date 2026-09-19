const API_URL = import.meta.env.VITE_API_URL || ''

async function request(url, options) {
  const response = await fetch(`${API_URL}${url}`, options)
  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) throw new Error(data?.error || 'No se pudo completar la operación.')
  return data
}

export const api = {
  get: () => request('/api/game'),
  action: (action, payload = {}) => request('/api/game/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  }),
  reset: () => request('/api/game/reset', { method: 'POST' }),
}
