import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

const MODULOS = [
  {
    group: 'Administração',
    items: [
      { path: '/diretor/dashboard', icon: 'monitoring', label: 'Dashboard Executivo', desc: 'KPIs e métricas institucionais', color: 'bg-indigo-600' },
      { path: '/diretor/indicadores', icon: 'bar_chart', label: 'Indicadores', desc: 'Taxa de aprovação, frequência, arrecadação', color: 'bg-blue-600' },
      { path: '/diretor/utilizadores', icon: 'manage_accounts', label: 'Utilizadores', desc: 'Gerir acessos e permissões', color: 'bg-cyan-600' },
      { path: '/diretor/aprovacoes', icon: 'approval', label: 'Aprovações', desc: 'Solicitações pendentes de aprovação', color: 'bg-orange-500' },
      { path: '/diretor/auditoria', icon: 'history', label: 'Auditoria', desc: 'Histórico de todas as acções', color: 'bg-slate-600' },
      { path: '/diretor/relatorios', icon: 'analytics', label: 'Relatórios Executivos', desc: 'Académico, financeiro, RH', color: 'bg-purple-600' },
    ],
  },
  {
    group: 'Políticas Institucionais',
    items: [
      { path: '/diretor/politicas/academicas', icon: 'school', label: 'Políticas Académicas', desc: 'Notas, frequência, critérios de avaliação', color: 'bg-emerald-600' },
      { path: '/diretor/politicas/financeiras', icon: 'payments', label: 'Políticas Financeiras', desc: 'Multas, descontos, bolsas, cobrança', color: 'bg-yellow-600' },
      { path: '/diretor/politicas/administrativas', icon: 'business', label: 'Políticas Administrativas', desc: 'Horários, missão, regras internas', color: 'bg-rose-600' },
    ],
  },
  {
    group: 'Portais do Sistema',
    items: [
      { path: '/secretaria', icon: 'desk', label: 'Secretaria', desc: 'Alunos, matrículas, documentos', color: 'bg-blue-500' },
      { path: '/pedagogico', icon: 'menu_book', label: 'Pedagógico', desc: 'Turmas, disciplinas, avaliações', color: 'bg-purple-500' },
      { path: '/professor', icon: 'person_raised_hand', label: 'Professor', desc: 'Notas, presenças, pautas', color: 'bg-green-500' },
      { path: '/financeiro', icon: 'account_balance', label: 'Financeiro', desc: 'Taxas, pagamentos, recibos', color: 'bg-yellow-500' },
      { path: '/rh', icon: 'groups', label: 'RH', desc: 'Funcionários, contratos, salários', color: 'bg-orange-500' },
      { path: '/relatorios', icon: 'summarize', label: 'Relatórios', desc: 'Pautas, boletins, relatórios', color: 'bg-red-500' },
    ],
  },
]

export default function DirectorPortal() {
  const { user, escola } = useAuth()
  const [stats, setStats] = useState(null)
  const [pendentes, setPendentes] = useState(0)

  useEffect(() => {
    api.get('/diretor/dashboard').then(r => setStats(r)).catch(() => {})
    api.get('/diretor/aprovacoes?estado=pendente').then(r => setPendentes(Array.isArray(r) ? r.length : 0)).catch(() => {})
  }, [])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {saudacao}, {user?.nome?.split(' ')[0]}
          </h1>
          <p className="text-on-surface-variant mt-1">
            {escola?.nome} · Ano Lectivo {escola?.ano_lectivo || '—'}
          </p>
        </div>
        {pendentes > 0 && (
          <Link to="/diretor/aprovacoes"
            className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-4 py-2.5 hover:bg-orange-100 transition-colors">
            <span className="material-symbols-outlined text-[18px]">notification_important</span>
            <span className="text-sm font-semibold">{pendentes} aprovação{pendentes > 1 ? 'ões' : ''} pendente{pendentes > 1 ? 's' : ''}</span>
          </Link>
        )}
      </div>

      {/* KPI rápido */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Alunos', value: stats.academicos?.total_alunos ?? 0, icon: 'groups', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Funcionários Activos', value: stats.rh?.funcionarios_ativos ?? 0, icon: 'badge', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Receita (MT)', value: Number(stats.financeiros?.receita ?? 0).toLocaleString('pt-MZ'), icon: 'payments', color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Utilizadores Activos', value: stats.administrativos?.utilizadores_ativos ?? 0, icon: 'person_check', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((k) => (
            <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
                <span className="text-xs text-on-surface-variant">{k.label}</span>
              </div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Módulos por grupo */}
      {MODULOS.map((grupo) => (
        <div key={grupo.group} className="mb-8">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">{grupo.group}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {grupo.items.map((m) => (
              <Link key={m.path} to={m.path}
                className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group relative">
                {m.path === '/diretor/aprovacoes' && pendentes > 0 && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {pendentes}
                  </span>
                )}
                <div className={`w-9 h-9 ${m.color} rounded-lg flex items-center justify-center mb-3`}>
                  <span className="material-symbols-outlined text-white text-[18px]">{m.icon}</span>
                </div>
                <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{m.label}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
