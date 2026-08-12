import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'

function getInitials(nome = '') {
  return nome.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const ITEMS = [
  { path: '/admin', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'Gestão' },
  { path: '/admin/escolas', icon: 'school', label: 'Escolas' },
  { path: '/admin/nova-escola', icon: 'add_circle', label: 'Nova Escola' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background antialiased">
      {menuAberto && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMenuAberto(false)} aria-hidden="true" />
      )}

      <aside
        className={`w-72 max-w-[85vw] sm:w-64 bg-primary-container flex flex-col fixed h-full z-50 md:z-40 transition-transform duration-300 ease-out
          ${menuAberto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">admin_panel_settings</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-sm truncate">SIGE Admin</h2>
              <p className="text-white/50 text-xs truncate">Gestão Global</p>
            </div>
          </div>
          <button
            onClick={() => setMenuAberto(false)}
            className="md:hidden text-white/70 hover:text-white transition-colors p-1 flex-shrink-0"
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {ITEMS.map((item) => (
            <div key={item.label || item.path}>
              {item.section ? (
                <div className="px-3 pt-5 pb-2">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{item.section}</span>
                </div>
              ) : (
                <NavLink to={item.path} end={item.end} onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'}`
                  }>
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-secondary-fixed flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
              {getInitials(user?.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-white/50 uppercase">Super Admin</p>
            </div>
            <button onClick={handleLogout} title="Sair" className="text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen min-w-0">
        <TopBar title="SIGE Admin" subtitle="Painel de Gestão Global" onMenuClick={() => setMenuAberto(true)} />
        <div className="pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
