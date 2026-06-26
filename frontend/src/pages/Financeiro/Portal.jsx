import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import StatCard from '../../components/ui/StatCard'
import PageHeader from '../../components/ui/PageHeader'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

export default function FinanceiroPortal() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/financeiro/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const modulos = [
    { path: '/financeiro/planos', icon: 'receipt_long', label: 'Planos de Propinas', desc: 'Definir valores por classe e ano', color: 'bg-indigo-500' },
    { path: '/financeiro/pagamentos', icon: 'payments', label: 'Registar Pagamento', desc: 'Registar pagamento de aluno', color: 'bg-green-500' },
    { path: '/financeiro/pendentes', icon: 'pending_actions', label: 'Validação', desc: 'Analisar e confirmar pagamentos', color: 'bg-amber-500', badge: (stats?.pendentes || 0) + (stats?.em_analise || 0) },
    { path: '/financeiro/contas', icon: 'account_balance_wallet', label: 'Contas de Alunos', desc: 'Saldo devedor por aluno', color: 'bg-blue-500' },
    { path: '/financeiro/dividas', icon: 'money_off', label: 'Dívidas', desc: 'Alunos com pagamentos em atraso', color: 'bg-red-500' },
    { path: '/financeiro/bolsas', icon: 'school', label: 'Bolsas e Descontos', desc: 'Gerir bolsas e isenções', color: 'bg-purple-500', badge: stats?.bolsas_pendentes },
    { path: '/financeiro/recibos', icon: 'receipt', label: 'Recibos', desc: 'Emitir e consultar recibos', color: 'bg-teal-500' },
    { path: '/financeiro/fecho', icon: 'lock_clock', label: 'Fecho Financeiro', desc: 'Fechar períodos financeiros', color: 'bg-gray-600' },
    { path: '/financeiro/relatorios', icon: 'bar_chart', label: 'Relatórios', desc: 'Análise financeira detalhada', color: 'bg-orange-500' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Portal Financeiro"
        subtitle="Gestão de propinas, pagamentos e controlos financeiros"
        action={
          <Link to="/financeiro/pagamentos"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Pagamento
          </Link>
        }
      />

      {stats?.pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
          <div>
            <p className="font-semibold text-amber-800">{stats.pendentes} pagamento(s) aguardam validação</p>
            <p className="text-sm text-amber-700">Aceda à Validação de Pagamentos para analisar e confirmar.</p>
          </div>
          <Link to="/financeiro/pendentes" className="ml-auto text-xs font-medium text-amber-700 underline hover:text-amber-900">Ver</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Receita Confirmada" value={stats ? fmt(stats.total_recebido) : '—'} icon="payments" color="text-green-600" bg="bg-green-50" />
        <StatCard label="Em Dívida" value={stats ? fmt(stats.divida_total) : '—'} icon="money_off" color="text-red-600" bg="bg-red-50" />
        <StatCard label="Pendentes" value={stats?.pendentes ?? '—'} icon="pending" color="text-amber-600" bg="bg-amber-50" />
        <StatCard label="Em Análise" value={stats?.em_analise ?? '—'} icon="manage_search" color="text-blue-600" bg="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modulos.map(m => (
          <Link key={m.path} to={m.path}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center flex-shrink-0 relative`}>
              <span className="material-symbols-outlined text-white">{m.icon}</span>
              {m.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">{m.badge}</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{m.label}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[20px]">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
