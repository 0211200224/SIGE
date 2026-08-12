import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../layout/TopBar'

function getInitials(nome = '') {
  return nome.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const ROLE_LABELS = {
  director: 'Director Geral',
  secretaria: 'Secretaria',
  professor: 'Professor',
  financeiro: 'Financeiro',
  rh: 'Recursos Humanos',
  pedagogico: 'Pedagógico',
  aluno: 'Estudante',
  super_admin: 'Super Admin',
}

export default function PortalLayout({ title, icon, color = 'bg-primary', items, backPath = '/dashboard' }) {
  const { user, escola, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background antialiased">
      {/* Backdrop — só em mobile, quando o drawer está aberto */}
      {menuAberto && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMenuAberto(false)} aria-hidden="true" />
      )}

      {/* Portal Sidebar */}
      <aside
        className={`w-72 max-w-[85vw] sm:w-64 flex flex-col fixed h-full z-50 md:z-40 transition-transform duration-300 ease-out
          ${menuAberto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ backgroundColor: escola?.cor_principal || '#1a2b4b' }}
      >
        {/* Portal header */}
        <div className="p-5 sm:p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(backPath)}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Voltar ao Menu
            </button>
            <button
              onClick={() => setMenuAberto(false)}
              className="md:hidden text-white/70 hover:text-white transition-colors p-1"
              aria-label="Fechar menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {escola?.logo
              ? <img src={escola.logo} alt={escola.sigla} className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5" />
              : <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white text-[18px]">{icon}</span>
                </div>
            }
            <div>
              <h2 className="font-bold text-white text-sm">{title}</h2>
              <p className="text-white/50 text-xs">{escola?.sigla || 'SIGE'}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map((section) => (
            <div key={section.label || section.path}>
              {section.section ? (
                <div className="px-3 pt-5 pb-2">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                    {section.section}
                  </span>
                </div>
              ) : (
                <NavLink
                  to={section.path}
                  end={section.end}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/8 hover:text-white'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
                  <span className="text-sm font-medium">{section.label}</span>
                  {section.badge && (
                    <span className="ml-auto bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {section.badge}
                    </span>
                  )}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: escola?.cor_secundaria || '#fdbc13' }}>
              {user?.foto
                ? <img src={user.foto} alt={user.nome} className="w-full h-full object-cover" />
                : <span>{getInitials(user?.nome)}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-white/50 uppercase">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Sair" className="text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 min-h-screen min-w-0">
        <TopBar title={title} subtitle={escola?.nome || 'Sistema de Gestão Escolar'} onMenuClick={() => setMenuAberto(true)} />
        <div className="pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
