import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'

const admissaoSteps = [
  {
    step: 1,
    label: 'Departamento',
    icon: 'apartment',
    desc: 'Definir departamentos',
    path: '/rh/departamentos',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    hoverBg: 'hover:bg-blue-50',
  },
  {
    step: 2,
    label: 'Cargo',
    icon: 'work',
    desc: 'Definir cargos e funções',
    path: '/rh/cargos',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hoverBorder: 'hover:border-orange-400',
    hoverBg: 'hover:bg-orange-50',
  },
  {
    step: 3,
    label: 'Funcionário',
    icon: 'badge',
    desc: 'Registar o funcionário',
    path: '/rh/funcionarios/novo',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    hoverBorder: 'hover:border-green-400',
    hoverBg: 'hover:bg-green-50',
  },
  {
    step: 4,
    label: 'Contrato',
    icon: 'description',
    desc: 'Criar contrato de trabalho',
    path: '/rh/contratos',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
    hoverBg: 'hover:bg-purple-50',
  },
]

const gestaoModulos = [
  { path: '/rh/funcionarios', icon: 'badge', label: 'Funcionários', desc: 'Ver lista completa', color: 'text-blue-600', bg: 'bg-blue-50' },
  { path: '/rh/ferias', icon: 'beach_access', label: 'Férias & Licenças', desc: 'Pedidos e aprovações', color: 'text-teal-600', bg: 'bg-teal-50' },
  { path: '/rh/faltas', icon: 'event_busy', label: 'Faltas', desc: 'Registo de ausências', color: 'text-red-600', bg: 'bg-red-50' },
  { path: '/rh/folha-pagamento', icon: 'payments', label: 'Folha de Pagamento', desc: 'Processamento salarial', color: 'text-amber-600', bg: 'bg-amber-50' },
  { path: '/relatorios/rh', icon: 'bar_chart', label: 'Relatório de RH', desc: 'Análise e exportação', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { path: '/rh/configuracao', icon: 'tune', label: 'Configuração Salarial', desc: 'Fórmula e escalões', color: 'text-cyan-600', bg: 'bg-cyan-50' },
]

export default function RHPortal() {
  const [stats, setStats] = useState({ total: '—', activos: '—', departamentos: '—', contratos_activos: '—' })

  useEffect(() => {
    api.get('/rh/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Recursos Humanos</h1>
          <p className="text-sm text-on-surface-variant mt-1">Gestão de funcionários, contratos, férias e folha salarial</p>
        </div>
        <Link
          to="/rh/funcionarios/novo"
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Novo Funcionário
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Funcionários', value: stats.total, icon: 'badge', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Activos', value: stats.activos, icon: 'check_circle', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Departamentos', value: stats.departamentos, icon: 'apartment', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Contratos Activos', value: stats.contratos_activos, icon: 'description', color: 'text-cyan-600', bg: 'bg-cyan-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined ${s.color} text-[20px]`}>{s.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-on-surface leading-none">{s.value}</p>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fluxo de Admissão */}
      <div className="bg-white border border-outline-variant rounded-2xl shadow-sm p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[20px]">route</span>
            Fluxo de Admissão
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Siga os passos em ordem para admitir um novo funcionário</p>
        </div>

        <div className="flex items-stretch gap-2">
          {admissaoSteps.map((s, i) => (
            <div key={s.step} className="flex items-center gap-2 flex-1 min-w-0">
              <Link
                to={s.path}
                className={`flex-1 flex flex-col items-center text-center gap-2 p-4 rounded-xl border ${s.border} ${s.hoverBorder} ${s.hoverBg} bg-white hover:shadow-md transition-all group cursor-pointer`}
              >
                <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${s.color} text-[24px]`}>{s.icon}</span>
                </div>
                <div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${s.color}`}>Passo {s.step}</span>
                  <p className="text-sm font-semibold text-on-surface mt-0.5 group-hover:text-blue-700 transition-colors">{s.label}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-tight">{s.desc}</p>
                </div>
              </Link>
              {i < admissaoSteps.length - 1 && (
                <span className="material-symbols-outlined text-on-surface-variant text-[20px] flex-shrink-0">arrow_forward</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gestão do dia-a-dia */}
      <div>
        <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">dashboard</span>
          Gestão do dia-a-dia
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {gestaoModulos.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              className="bg-white border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className={`w-10 h-10 ${m.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined ${m.color} text-[20px]`}>{m.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{m.label}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{m.desc}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[18px] flex-shrink-0">chevron_right</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
