const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const getToken = () => localStorage.getItem('sige_token')

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

const handleResponse = async (res) => {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Erro na requisição')
  return data
}

export const api = {
  get: (path) =>
    fetch(`${BASE}${path}`, { headers: headers() }).then(handleResponse),
  post: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),
  put: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),
  patch: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),
  delete: (path) =>
    fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handleResponse),
}
