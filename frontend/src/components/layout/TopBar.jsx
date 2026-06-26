import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

const TIPO_ICON = { informativa: 'info', critica: 'warning', aprovacao: 'approval' }
const TIPO_COLOR = { informativa: 'text-blue-500', critica: 'text-red-500', aprovacao: 'text-orange-500' }

function fmtData(d) {
  const dt = new Date(d)
  const diff = Math.floor((Date.now() - dt) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return dt.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' })
}

// Bell panel
function NotifPanel({ notifs, naoLidas, onMarcarLida, onMarcarTodas, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-on-surface">Notificações</h3>
          {naoLidas > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{naoLidas}</span>
          )}
        </div>
        {naoLidas > 0 && (
          <button onClick={onMarcarTodas} className="text-xs text-primary hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/50">
        {notifs.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">notifications_none</span>
            <p className="text-sm text-on-surface-variant">Sem notificações de momento</p>
          </div>
        ) : notifs.map((n) => (
          <div
            key={n.id}
            onClick={() => { if (!n.lida) onMarcarLida(n.id); onClose() }}
            className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-surface-bright transition-colors ${!n.lida ? 'bg-blue-50/60' : ''}`}
          >
            <div className={`mt-0.5 flex-shrink-0 ${TIPO_COLOR[n.tipo] || 'text-gray-400'}`}>
              <span className="material-symbols-outlined text-[20px]">{TIPO_ICON[n.tipo] || 'circle'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug ${!n.lida ? 'font-semibold text-on-surface' : 'text-on-surface'}`}>{n.titulo}</p>
              <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{n.mensagem}</p>
              <div className="flex items-center gap-2 mt-1">
                {n.modulo && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{n.modulo}</span>
                )}
                <span className="text-[10px] text-on-surface-variant">{fmtData(n.criado_em)}</span>
              </div>
            </div>
            {!n.lida && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// Search result row types
const SEARCH_ICON = { aluno: 'person', funcionario: 'badge' }
const SEARCH_COLOR = { aluno: 'text-blue-600 bg-blue-50', funcionario: 'text-green-600 bg-green-50' }

function SearchPanel({ query, results, loading, onSelect }) {
  if (!query) return null
  return (
    <div className="absolute left-0 top-full mt-2 w-full min-w-[320px] bg-white rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50">
      {loading ? (
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="material-symbols-outlined animate-spin text-primary text-[20px]">progress_activity</span>
          <span className="text-sm text-on-surface-variant">A pesquisar...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <span className="material-symbols-outlined text-[32px] text-outline-variant block mb-1">search_off</span>
          <p className="text-sm text-on-surface-variant">Sem resultados para "{query}"</p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/40">
          {results.map((r) => (
            <button key={`${r.tipo}-${r.id}`} onClick={() => onSelect(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-bright transition-colors text-left">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${SEARCH_COLOR[r.tipo]}`}>
                <span className="material-symbols-outlined text-[16px]">{SEARCH_ICON[r.tipo]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-on-surface truncate">{r.nome}</p>
                <p className="text-xs text-on-surface-variant">{r.tipo === 'aluno' ? `Nº ${r.numero_matricula || '—'}` : r.cargo_nome || r.role || '—'}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${SEARCH_COLOR[r.tipo]}`}>
                {r.tipo === 'aluno' ? 'Aluno' : 'Funcionário'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopBar({ title, subtitle }) {
  const { user, escola } = useAuth()
  const navigate = useNavigate()

  // Notifications
  const [notifs, setNotifs] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const searchTimer = useRef(null)

  const displayTitle = title || escola?.nome || 'SIGE'
  const displaySubtitle = subtitle || 'Sistema Integrado de Gestão Escolar'

  // Load notifications
  const carregarNotifs = useCallback(async () => {
    try {
      const [lista, naoLidasRes] = await Promise.all([
        api.get('/notificacoes?limit=20'),
        api.get('/notificacoes/nao-lidas'),
      ])
      setNotifs(Array.isArray(lista) ? lista : [])
      setNaoLidas(naoLidasRes?.total || 0)
    } catch {
      setNotifs([])
      setNaoLidas(0)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    carregarNotifs()
    const iv = setInterval(carregarNotifs, 30000)
    return () => clearInterval(iv)
  }, [user, carregarNotifs])

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const marcarLida = async (id) => {
    try {
      await api.patch(`/notificacoes/${id}/ler`)
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lida: 1 } : n))
      setNaoLidas((p) => Math.max(0, p - 1))
    } catch {}
  }

  const marcarTodas = async () => {
    try {
      await api.patch('/notificacoes/ler-todas')
      setNotifs((prev) => prev.map((n) => ({ ...n, lida: 1 })))
      setNaoLidas(0)
    } catch {}
  }

  // Search with debounce
  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    setSearchOpen(!!q)
    clearTimeout(searchTimer.current)
    if (!q.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const [alunosRes, funcsRes] = await Promise.allSettled([
          api.get(`/secretaria/alunos?search=${encodeURIComponent(q)}`),
          api.get(`/rh/funcionarios?nome=${encodeURIComponent(q)}`),
        ])
        const alunos = (alunosRes.status === 'fulfilled' ? (alunosRes.value?.data || alunosRes.value || []) : [])
          .slice(0, 4).map(a => ({ ...a, tipo: 'aluno' }))
        const funcs = (funcsRes.status === 'fulfilled' ? (funcsRes.value?.data || funcsRes.value || []) : [])
          .slice(0, 4).map(f => ({ ...f, tipo: 'funcionario' }))
        setSearchResults([...alunos, ...funcs])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }

  const handleSearchSelect = (result) => {
    setSearchQuery('')
    setSearchOpen(false)
    if (result.tipo === 'aluno') navigate(`/secretaria/alunos/${result.id}`)
    else navigate(`/rh/funcionarios/${result.id}`)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchOpen(false)
    navigate(`/secretaria/alunos?search=${encodeURIComponent(searchQuery)}`)
  }

  return (
    <header className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 w-full md:w-[calc(100%-16rem)] z-30 px-4 py-3 flex items-center gap-3 h-16">
      {/* Title */}
      <div className="flex-shrink-0">
        <h2 className="text-base font-bold text-primary leading-tight">{displayTitle}</h2>
        <p className="text-[11px] text-on-surface-variant leading-tight">{displaySubtitle}</p>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center px-4">
        <div ref={searchRef} className="relative w-full max-w-md">
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 bg-surface-bright border border-outline-variant rounded-full px-4 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] flex-shrink-0">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Pesquisar alunos, funcionários..."
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none min-w-0"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false) }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </form>

          {searchOpen && (
            <SearchPanel
              query={searchQuery}
              results={searchResults}
              loading={searchLoading}
              onSelect={handleSearchSelect}
            />
          )}
        </div>
      </div>

      {/* Right: Bell only */}
      <div className="flex items-center flex-shrink-0">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((p) => !p)}
            className="relative p-2 text-on-surface-variant hover:bg-surface-bright hover:text-on-surface rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-surface">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>

          {bellOpen && (
            <NotifPanel
              notifs={notifs}
              naoLidas={naoLidas}
              onMarcarLida={marcarLida}
              onMarcarTodas={marcarTodas}
              onClose={() => setBellOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  )
}
