import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'

function getInitials(nome = '') {
  return nome.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// Sequência de páginas para navegação ← →
const PAGES = [
  { path: '/diretor/indicadores', label: 'Indicadores' },
  { path: '/diretor/utilizadores', label: 'Utilizadores' },
  { path: '/diretor/aprovacoes', label: 'Aprovações' },
  { path: '/diretor/auditoria', label: 'Auditoria' },
  { path: '/diretor/politicas/academicas', label: 'Pol. Académicas' },
  { path: '/diretor/politicas/financeiras', label: 'Pol. Financeiras' },
  { path: '/diretor/politicas/administrativas', label: 'Pol. Administrativas' },
  { path: '/diretor/relatorios', label: 'Relatórios Executivos' },
]

const NAV_ITEMS = [
  { section: 'ANÁLISE' },
  { path: '/diretor/indicadores', icon: 'bar_chart', label: 'Indicadores' },
  { path: '/diretor/relatorios', icon: 'analytics', label: 'Relatórios' },
  { section: 'GESTÃO' },
  { path: '/diretor/utilizadores', icon: 'manage_accounts', label: 'Utilizadores' },
  { path: '/diretor/aprovacoes', icon: 'approval', label: 'Aprovações', badgeKey: 'aprovacoes' },
  { path: '/diretor/auditoria', icon: 'history', label: 'Auditoria' },
  { section: 'POLÍTICAS' },
  { path: '/diretor/politicas/academicas', icon: 'school', label: 'Académicas' },
  { path: '/diretor/politicas/financeiras', icon: 'payments', label: 'Financeiras' },
  { path: '/diretor/politicas/administrativas', icon: 'business', label: 'Administrativas' },
]

const PORTAIS = [
  { path: '/secretaria', icon: 'desk', label: 'Secretaria' },
  { path: '/pedagogico', icon: 'menu_book', label: 'Pedagógico' },
  { path: '/professor', icon: 'person_raised_hand', label: 'Professor' },
  { path: '/financeiro', icon: 'account_balance', label: 'Financeiro' },
  { path: '/rh', icon: 'groups', label: 'Recursos Humanos' },
  { path: '/relatorios', icon: 'summarize', label: 'Relatórios' },
]

// Barra de navegação ← → entre páginas do portal
function PageNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const idx = PAGES.findIndex(p => p.path === pathname)
  const current = PAGES[idx]
  const prev = idx > 0 ? PAGES[idx - 1] : null
  const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null

  if (!current) return null

  return (
    <div className="flex items-center gap-2 px-6 py-2.5 bg-surface border-b border-outline-variant text-sm select-none">
      <button
        onClick={() => prev && navigate(prev.path)}
        disabled={!prev}
        title={prev ? `← ${prev.label}` : ''}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
          prev
            ? 'text-primary hover:bg-primary/10 cursor-pointer'
            : 'text-on-surface-variant/30 cursor-default'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        {prev && <span className="hidden sm:inline text-xs">{prev.label}</span>}
      </button>

      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-xs font-semibold text-on-surface">{current.label}</span>
        <span className="text-on-surface-variant/40 text-xs">
          {idx + 1} / {PAGES.length}
        </span>
      </div>

      <button
        onClick={() => next && navigate(next.path)}
        disabled={!next}
        title={next ? `${next.label} →` : ''}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
          next
            ? 'text-primary hover:bg-primary/10 cursor-pointer'
            : 'text-on-surface-variant/30 cursor-default'
        }`}
      >
        {next && <span className="hidden sm:inline text-xs">{next.label}</span>}
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  )
}

export default function DirectorLayout({ pendingAprovacoes = 0 }) {
  const { user, escola, logout } = useAuth()
  const navigate = useNavigate()
  const [portaisOpen, setPortaisOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const cor = escola?.cor_principal || '#1a2b4b'

  return (
    <div className="flex min-h-screen bg-background antialiased">
      <aside className="w-64 flex-col hidden md:flex fixed h-full z-40" style={{ backgroundColor: cor }}>

        {/* Logo / Home */}
        <Link to="/diretor" className="block p-5 border-b border-white/10 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            {escola?.logo
              ? <img src={escola.logo} alt={escola.sigla} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-0.5" />
              : <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[22px]">shield_person</span>
                </div>
            }
            <div>
              <h2 className="font-bold text-white text-sm leading-tight">Portal do Director</h2>
              <p className="text-white/50 text-[11px]">{escola?.sigla || 'SIGE'}</p>
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="px-3 pt-4 pb-1.5">
                  <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">{item.section}</span>
                </div>
              )
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badgeKey === 'aprovacoes' && pendingAprovacoes > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingAprovacoes}
                  </span>
                )}
              </NavLink>
            )
          })}

          {/* Portais colapsáveis */}
          <div className="px-3 pt-4 pb-1.5">
            <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">PORTAIS</span>
          </div>
          <button
            type="button"
            onClick={() => setPortaisOpen(prev => !prev)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/65 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <span className="material-symbols-outlined text-[20px]">apps</span>
            <span className="text-sm font-medium flex-1 text-left">Outros Portais</span>
            <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${portaisOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
          {portaisOpen && (
            <div className="ml-2 mt-0.5 space-y-0.5 pb-1">
              {PORTAIS.map(p => (
                <Link key={p.path} to={p.path}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/55 hover:bg-white/10 hover:text-white transition-all duration-150">
                  <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                  <span className="text-xs font-medium">{p.label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            {user?.foto
              ? <img src={user.foto} alt={user.nome} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
              : <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {getInitials(user?.nome)}
                </div>
            }
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-white/50 uppercase">Director Geral</p>
            </div>
            <button onClick={handleLogout} title="Sair" className="text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar title="Portal do Director" subtitle={escola?.nome || 'Sistema de Gestão Escolar'} />
        <div className="pt-16 flex flex-col flex-1">
          <PageNav />
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
