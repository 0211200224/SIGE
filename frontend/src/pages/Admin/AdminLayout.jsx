import { Outlet, NavLink, useNavigate } from 'react-router-dom'
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

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="flex min-h-screen bg-background antialiased">
      <aside className="w-64 bg-primary-container flex-col hidden md:flex fixed h-full z-40">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">SIGE Admin</h2>
              <p className="text-white/50 text-xs">Gestão Global</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {ITEMS.map((item) => (
            <div key={item.label || item.path}>
              {item.section ? (
                <div className="px-3 pt-5 pb-2">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{item.section}</span>
                </div>
              ) : (
                <NavLink to={item.path} end={item.end}
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

      <main className="flex-1 md:ml-64 min-h-screen">
        <TopBar title="SIGE Admin" subtitle="Painel de Gestão Global" />
        <div className="pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
