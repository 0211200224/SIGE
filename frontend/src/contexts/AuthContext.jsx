import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

const ROLE_HOME = {
  director: '/diretor',
  secretaria: '/secretaria',
  professor: '/professor',
  financeiro: '/financeiro',
  rh: '/rh',
  pedagogico: '/pedagogico',
  aluno: '/estudante',
  super_admin: '/admin',
}

// Portais a que a conta tem acesso: o principal + adicionais concedidos pelo
// Diretor. Sessões antigas (antes desta funcionalidade) só têm `role`.
export const portaisDe = (user) => (user?.portais?.length ? user.portais : (user?.role ? [user.role] : []))

// Com mais de um portal, a entrada é o ecrã de escolha; com um só, vai
// directo ao portal (comportamento de sempre).
export const homeDe = (user) => (portaisDe(user).length > 1 ? '/portais' : (ROLE_HOME[user?.role] || '/'))

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [escola, setEscola] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sige_token')
    const savedUser = localStorage.getItem('sige_user')
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      fetchEscola(parsedUser.escola_id)
      actualizarPortais(parsedUser)
    }
    setLoading(false)
  }, [])

  // Vai buscar os portais actuais ao servidor: um portal concedido ou
  // retirado pelo Diretor (ou um acesso temporário que expirou) reflecte-se
  // sem ser preciso sair e voltar a entrar.
  const actualizarPortais = async (base) => {
    try {
      const r = await api.get('/auth/me')
      if (!r.data) return
      if (r.data.activo === 0) { logout(); return }
      const actualizado = { ...base, portais: r.data.portais, role: r.data.role }
      localStorage.setItem('sige_user', JSON.stringify(actualizado))
      setUser(actualizado)
    } catch {}
  }

  const fetchEscola = async (escolaId) => {
    if (!escolaId) return
    try {
      const res = await api.get(`/escolas/${escolaId}`)
      setEscola(res.data)
    } catch {}
  }

  const login = async (codigo, password) => {
    const res = await api.post('/auth/login', { codigo, password })
    const { token, user: userData, primeiro_login } = res.data
    localStorage.setItem('sige_token', token)
    localStorage.setItem('sige_user', JSON.stringify(userData))
    setUser(userData)
    await fetchEscola(userData.escola_id)
    return { user: userData, primeiro_login }
  }

  const logout = () => {
    localStorage.removeItem('sige_token')
    localStorage.removeItem('sige_user')
    setUser(null)
    setEscola(null)
  }

  const refreshEscola = () => {
    if (user?.escola_id) fetchEscola(user.escola_id)
  }

  const roleHome = (role) => ROLE_HOME[role] || '/'
  const temPortal = (portal) => portaisDe(user).includes(portal)

  return (
    <AuthContext.Provider value={{ user, escola, loading, login, logout, refreshEscola, roleHome, temPortal }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export { ROLE_HOME }
