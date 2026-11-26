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
  // Descarrega um ficheiro binário (ex: .xlsx) com o token de sessão -- um
  // simples <a href> não enviaria o cabeçalho Authorization.
  download: async (path, nomeFicheiro) => {
    const res = await fetch(`${BASE}${path}`, { headers: headers() })
    if (!res.ok) {
      let mensagem = 'Erro ao descarregar o ficheiro'
      try { const d = await res.json(); mensagem = d.error || d.message || mensagem } catch {}
      throw new Error(mensagem)
    }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = nomeFicheiro
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
