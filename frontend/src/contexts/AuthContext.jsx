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
    }
    setLoading(false)
  }, [])

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

  return (
    <AuthContext.Provider value={{ user, escola, loading, login, logout, refreshEscola, roleHome }}>
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
