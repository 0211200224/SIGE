import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const MENUS = {
  director: [
    { path: '/diretor', icon: 'shield_person', label: 'Portal Director' },
    { path: '/diretor/dashboard', icon: 'monitoring', label: 'Dashboard' },
    { path: '/pedagogico', icon: 'school', label: 'Pedagógico' },
    { path: '/rh', icon: 'groups', label: 'RH' },
    { path: '/secretaria', icon: 'desk', label: 'Secretaria' },
    { path: '/financeiro', icon: 'payments', label: 'Financeiro' },
    { path: '/relatorios', icon: 'analytics', label: 'Relatórios' },
  ],
  pedagogico: [
    { path: '/pedagogico', icon: 'school', label: 'Pedagógico' },
  ],
  secretaria: [
    { path: '/secretaria', icon: 'desk', label: 'Secretaria' },
  ],
  professor: [
    { path: '/professor', icon: 'person', label: 'Área do Professor' },
  ],
  financeiro: [
    { path: '/financeiro', icon: 'payments', label: 'Financeiro' },
  ],
  rh: [
    { path: '/rh', icon: 'groups', label: 'Recursos Humanos' },
  ],
}

const ROLE_LABELS = {
  director: 'Director Geral',
  secretaria: 'Secretaria',
  professor: 'Professor',
  financeiro: 'Financeiro',
  rh: 'Recursos Humanos',
  pedagogico: 'Pedagógico',
}

function getInitials(nome = '') {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, escola, logout } = useAuth()

  const navItems = MENUS[user?.role] || []

  const isActive = (path) => {
    if (path === '/diretor') return location.pathname === '/diretor'
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 text-white flex-col hidden md:flex fixed h-full z-40"
      style={{ backgroundColor: escola?.cor_principal || '#1a2b4b' }}>
      {/* Logo */}
      <div className="p-6">
        {escola?.logo
          ? <img src={escola.logo} alt={escola.sigla} className="h-12 max-w-full object-contain mb-3" />
          : (
            <h1 className="font-bold text-xl tracking-tight text-white mb-1">
              {escola?.sigla || 'SIGE'}
            </h1>
          )
        }
        <p className="text-white/50 text-xs truncate">
          {escola?.nome || 'Sistema de Gestão Escolar'}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const corSecundaria = escola?.cor_secundaria || '#fdbc13'
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 transition-all duration-200 ${
                active ? '' : 'text-on-primary-container hover:bg-white/5 border-transparent'
              }`}
              style={active ? { backgroundColor: corSecundaria + '1a', color: corSecundaria, borderColor: corSecundaria } : undefined}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          )
        })}

        {/* Configurações — apenas director */}
        {user?.role === 'director' && (
          <>
            <div className="pt-8 pb-2">
              <span className="px-4 text-xs font-semibold text-on-primary-container/50 uppercase tracking-widest">
                Sistema
              </span>
            </div>
            <Link
              to="/configuracao"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive('/configuracao') ? '' : 'text-on-primary-container hover:bg-white/5'
              }`}
              style={isActive('/configuracao')
                ? { backgroundColor: (escola?.cor_secundaria || '#fdbc13') + '1a', color: escola?.cor_secundaria || '#fdbc13' }
                : undefined}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-label-md text-label-md">Configurações</span>
            </Link>
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: escola?.cor_secundaria || '#fdbc13' }}>
              {user?.foto
                ? <img src={user.foto} alt={user.nome} className="w-full h-full object-cover" />
                : <span>{getInitials(user?.nome)}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-md text-label-md text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-on-primary-container uppercase tracking-tighter">
                {ROLE_LABELS[user?.role] || user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
